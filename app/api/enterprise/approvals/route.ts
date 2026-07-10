import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET /api/enterprise/approvals — 获取审批列表
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 可选筛选

    const where: Record<string, unknown> = { ...buildFilter(identity) };
    if (status) where.status = status;

    const approvals = await prisma.approval.findMany({
      where: where as any,
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });

    // 补充申请人/审批人名称
    const userIds = new Set<string>();
    approvals.forEach(a => {
      if (a.submittedBy) userIds.add(a.submittedBy);
      if (a.approvedBy) userIds.add(a.approvedBy);
    });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const enriched = approvals.map(a => ({
      ...a,
      applicantName: userMap.get(a.submittedBy) || '未知用户',
      approverName: a.approvedBy ? (userMap.get(a.approvedBy) || '未知用户') : null,
    }));

    return NextResponse.json({ approvals: enriched });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/enterprise/approvals — 审批通过/拒绝
export async function POST(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const body = await request.json();
    const { id, action, comment } = body; // action: 'APPROVED' | 'REJECTED'

    if (!id || !action) {
      return NextResponse.json({ code: 1, message: '参数不完整' }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ code: 1, message: '无效的审批动作' }, { status: 400 });
    }

    const approval = await prisma.approval.findUnique({ where: { id } });
    if (!approval || approval.tenantId !== identity.orgId) {
      return NextResponse.json({ code: 1, message: '审批记录不存在' }, { status: 404 });
    }

    if (approval.status !== 'PENDING') {
      return NextResponse.json({ code: 1, message: '该审批已处理' }, { status: 400 });
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: action,
        approvedBy: identity.userId,
        comment: comment || null,
        processedAt: new Date(),
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        identityType: identity.identityType,
        tenantId: identity.orgId,
        userId: identity.userId,
        action: action === 'APPROVED' ? 'APPROVE' : 'REJECT',
        entity: 'CONTRACT',
        entityId: id,
        detail: `审批${action === 'APPROVED' ? '通过' : '拒绝'}: ${approval.title}`,
      },
    });

    return NextResponse.json({ code: 0, message: '操作成功', data: updated });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ code: 1, message: '操作失败' }, { status: 500 });
  }
}
