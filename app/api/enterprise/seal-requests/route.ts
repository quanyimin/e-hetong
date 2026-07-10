import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET /api/enterprise/seal-requests — 获取用印申请列表
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const requests = await prisma.sealRequest.findMany({
      where: { ...buildFilter(identity) },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });

    // 补充印章名称和申请人名称
    const userIds = new Set<string>();
    const sealIds = new Set<string>();
    requests.forEach(r => {
      if (r.applicantId) userIds.add(r.applicantId);
      if (r.sealId) sealIds.add(r.sealId);
      if (r.processedBy) userIds.add(r.processedBy);
    });

    const [users, seals] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true },
      }),
      prisma.seal.findMany({
        where: { id: { in: Array.from(sealIds) } },
        select: { id: true, name: true },
      }),
    ]);

    const userMap = new Map(users.map(u => [u.id, u.name]));
    const sealMap = new Map(seals.map(s => [s.id, s.name]));

    const enriched = requests.map(r => ({
      ...r,
      sealName: sealMap.get(r.sealId) || '未知印章',
      applicantName: userMap.get(r.applicantId) || '未知用户',
      processorName: r.processedBy ? (userMap.get(r.processedBy) || '未知用户') : null,
    }));

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error('Error fetching seal requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/enterprise/seal-requests — 提交用印申请
export async function POST(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const body = await request.json();
    const { sealId, purpose, contractRef } = body;

    if (!sealId || !purpose) {
      return NextResponse.json({ code: 1, message: '印章和用途不能为空' }, { status: 400 });
    }

    // 校验印章是否存在且属于该租户
    const seal = await prisma.seal.findUnique({ where: { id: sealId } });
    if (!seal || seal.tenantId !== identity.orgId) {
      return NextResponse.json({ code: 1, message: '印章不存在' }, { status: 404 });
    }

    const request_created = await prisma.sealRequest.create({
      data: {
        identityType: identity.identityType,
        tenantId: identity.orgId,
        sealId,
        applicantId: identity.userId,
        purpose,
        contractRef: contractRef || null,
        status: 'PENDING',
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        identityType: identity.identityType,
        tenantId: identity.orgId,
        userId: identity.userId,
        action: 'CREATE',
        entity: 'CONTRACT',
        entityId: request_created.id,
        detail: `提交用印申请: ${seal.name} - ${purpose}`,
      },
    });

    return NextResponse.json({ code: 0, message: '提交成功', data: request_created });
  } catch (error) {
    console.error('Error creating seal request:', error);
    return NextResponse.json({ code: 1, message: '提交失败' }, { status: 500 });
  }
}
