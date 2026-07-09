import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取单个合同详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ code: 1, message: '缺少合同ID' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        reminders: {
          orderBy: { remindAt: 'desc' },
          take: 10,
          select: { id: true, title: true, remindAt: true, remindType: true, sendStatus: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ code: 1, message: '合同不存在' }, { status: 404 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    // TODO: Phase 2 迁移到 tenantId 校验
    if (contract.userId !== currentUser.id) return forbidden('您无权访问该合同');

    const now = new Date();
    let status = 'active';
    if (contract.endDate) {
      if (contract.endDate < now) {
        status = 'expired';
      } else if (contract.endDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
        status = 'expiring';
      }
    }

    // 解析 AI 提取结果（存储于 parsedData JSON 字符串）
    let parsedAi: any = null;
    try {
      if (contract.parsedData) parsedAi = JSON.parse(contract.parsedData);
    } catch { /* ignore parse errors */ }

    // SQLite 下 tags 存为 JSON 字符串，需反序列化
    const tags = contract.tags ? (() => { try { return JSON.parse(contract.tags); } catch { return []; } })() : [];
    const keywords = parsedAi?.keywords || [];
    const keyClauses = parsedAi?.keyClauses || [];
    const riskAlerts = parsedAi?.riskAlerts || [];

    return NextResponse.json({
      code: 0,
      data: {
        id: contract.id,
        name: contract.name,
        type: contract.type || '',
        financialType: contract.type || 'OTHER',
        category: contract.type,
        partyA: contract.partyA || '',
        partyB: contract.partyB || '',
        amount: contract.amount ? Number(contract.amount) : null,
        startDate: contract.startDate ? contract.startDate.toISOString().split('T')[0] : null,
        endDate: contract.endDate ? contract.endDate.toISOString().split('T')[0] : null,
        fileUrl: contract.fileUrl,
        fileType: contract.fileType || '',
        parseStatus: contract.parseStatus,
        status,
        tags,
        keywords,
        summary: parsedAi?.summary || '',
        remark: contract.remark || '',
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        folder: null,
        reminders: contract.reminders,
        parsedData: {
          contractName: contract.name,
          contractType: contract.type,
          summary: parsedAi?.summary || '',
          keyClauses,
          riskAlerts,
        },
      },
    });
  } catch (error) {
    console.error('[合同详情API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取合同详情失败' }, { status: 500 });
  }
}

// PATCH: 更新合同信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ code: 1, message: '合同不存在' }, { status: 404 });
    }
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    // TODO: Phase 2 迁移到 tenantId 校验
    if (contract.userId !== currentUser.id) return forbidden('您无权修改该合同');

    const updateData: any = {};
    const allowedFields = ['name', 'type', 'partyA', 'partyB', 'startDate', 'endDate', 'remark'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = field === 'startDate' || field === 'endDate'
          ? (body[field] ? new Date(body[field]) : null)
          : body[field];
      }
    }

    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.tags !== undefined) updateData.tags = body.tags;

    await prisma.contract.update({ where: { id }, data: updateData });

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('[合同更新API] 错误:', error);
    return NextResponse.json({ code: 1, message: '更新失败' }, { status: 500 });
  }
}
