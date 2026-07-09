import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取提醒列表（按租户隔离）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '15');
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少tenantId参数' }, { status: 400 });
    }

    // 数据隔离校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    const where: any = { tenantId };
    if (type) where.remindType = type;
    // 兼容大小写：前端传小写，数据库存大写
    if (status) {
      where.sendStatus = status.toUpperCase();
    }

    const [total, reminders] = await Promise.all([
      prisma.reminder.count({ where }),
      prisma.reminder.findMany({
        where,
        include: { contract: { select: { id: true, name: true } } },
        orderBy: { remindAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const list = reminders.map((r) => ({
      id: r.id,
      contractId: r.contractId || '',
      contractName: (r.contract as any)?.name || '',
      title: r.title || '',
      message: r.message || '', // 使用数据库 message 字段
      remindAt: r.remindAt.toISOString(),
      remindType: r.remindType, // 使用数据库 remindType 字段
      sendStatus: (r.sendStatus || '').toLowerCase(), // 返回小写给前端
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      code: 0,
      data: { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('[提醒API] GET 错误:', error);
    return NextResponse.json({ code: 1, message: '获取提醒列表失败' }, { status: 500 });
  }
}

// POST: 创建提醒
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, contractId, contractName, title, message, remindAt, remindType } = body;

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少tenantId' }, { status: 400 });
    }

    // 数据隔离校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');
    if (!userId) {
      return NextResponse.json({ code: 1, message: '缺少userId' }, { status: 400 });
    }
    if (!title || !remindAt) {
      return NextResponse.json({ code: 1, message: '缺少必填字段' }, { status: 400 });
    }

    // 创建提醒（不强制要求关联合同，允许独立提醒）
    const reminderData: any = {
      tenantId,
      userId,
      title,
      remindType: remindType || 'custom',
      remindAt: new Date(remindAt),
      message: message || title,
      sendStatus: 'PENDING',
    };

    // 如果提供了合同ID且合同存在，则关联
    if (contractId) {
      const existingContract = await prisma.contract.findUnique({ where: { id: contractId } });
      if (existingContract) {
        reminderData.contractId = contractId;
      }
    }

    const reminder = await prisma.reminder.create({ data: reminderData });

    return NextResponse.json({ code: 0, message: '创建成功', data: { id: reminder.id } });
  } catch (error) {
    console.error('[提醒API] POST 错误:', error);
    return NextResponse.json({ code: 1, message: '创建提醒失败', error: String(error) }, { status: 500 });
  }
}

// PATCH: 更新提醒状态
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { sendStatus } = body;

    if (!id) return NextResponse.json({ code: 1, message: '缺少提醒ID' }, { status: 400 });
    if (!sendStatus) return NextResponse.json({ code: 1, message: '缺少状态' }, { status: 400 });

    // 先获取提醒，确定所属租户
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return NextResponse.json({ code: 1, message: '提醒不存在' }, { status: 404 });

    // 数据隔离校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    if (!reminder.tenantId) return forbidden('提醒未关联主体');
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId: reminder.tenantId },
    });
    if (!membership) return forbidden('您无权操作该提醒');

    // 统一转为大写存储
    const statusUpper = sendStatus.toUpperCase();
    const updateData: any = { sendStatus: statusUpper };
    if (statusUpper === 'SENT') updateData.sentAt = new Date();

    await prisma.reminder.update({ where: { id }, data: updateData });
    return NextResponse.json({ code: 0, message: '状态已更新' });
  } catch (error) {
    console.error('[提醒API] PATCH 错误:', error);
    return NextResponse.json({ code: 1, message: '更新失败' }, { status: 500 });
  }
}

// DELETE: 删除提醒
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ code: 1, message: '缺少提醒ID' }, { status: 400 });

    // 先获取提醒，确定所属租户
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return NextResponse.json({ code: 1, message: '提醒不存在' }, { status: 404 });

    // 数据隔离校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    if (!reminder.tenantId) return forbidden('提醒未关联主体');
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId: reminder.tenantId },
    });
    if (!membership) return forbidden('您无权操作该提醒');

    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ code: 0, message: '提醒已删除' });
  } catch (error) {
    console.error('[提醒API] DELETE 错误:', error);
    return NextResponse.json({ code: 1, message: '删除失败' }, { status: 500 });
  }
}
