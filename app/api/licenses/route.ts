import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET /api/licenses - 证照列表
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');

    const where: Record<string, unknown> = { ...buildFilter(identity) };
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;

    const licenses = await prisma.license.findMany({
      where: where as any,
      orderBy: { expireDate: 'asc' },
    });

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const stats = {
      total: licenses.length,
      active: licenses.filter(l => l.status === 'ACTIVE').length,
      expiring: licenses.filter(l => l.status === 'ACTIVE' && l.expireDate && l.expireDate <= thirtyDays && l.expireDate > now).length,
      expired: licenses.filter(l => l.status === 'EXPIRED' || (l.expireDate && l.expireDate <= now)).length,
    };

    return NextResponse.json({ licenses, stats });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/licenses - 创建证照
export async function POST(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const body = await request.json();
    // 自动计算状态
    let status = body.status || 'ACTIVE';
    if (body.expireDate && !body.status) {
      const expireDate = new Date(body.expireDate);
      status = expireDate <= new Date() ? 'EXPIRED' : 'ACTIVE';
    }
    const license = await prisma.license.create({
      data: {
        userId: body.userId,
        tenantId: identity.orgId,
        identityType: identity.identityType,
        name: body.name,
        licenseNumber: body.licenseNumber,
        issuingAuthority: body.issuingAuthority,
        type: body.type,
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        expireDate: body.expireDate ? new Date(body.expireDate) : undefined,
        notifyDays: body.notifyDays || 30,
        status,
        attachmentUrl: body.attachmentUrl,
        tags: body.tags ? JSON.stringify(body.tags) : undefined,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
        files: body.files ? JSON.stringify(body.files) : undefined,
      },
    });
    return NextResponse.json({ license }, { status: 201 });
  } catch (error) {
    console.error('Error creating license:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
