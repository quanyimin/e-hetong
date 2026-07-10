import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET: 获取合同列表
export async function GET(request: NextRequest) {
  const { identity, error } = await requireOrgAccess(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const financialType = searchParams.get('financialType') || '';
  const status = searchParams.get('status') || '';

  const where: any = { ...buildFilter(identity) };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { partyA: { contains: search } },
      { partyB: { contains: search } },
    ];
  }
  if (type) where.type = type;
  if (financialType) where.financialType = financialType;
  if (status === 'expiring') {
    where.endDate = { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  } else if (status === 'expired') {
    where.endDate = { lt: new Date() };
  }

  const [total, contracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // 格式化返回
  const list = contracts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type || '',
    financialType: c.type || 'OTHER',
    partyA: c.partyA || '',
    partyB: c.partyB || '',
    amount: c.amount,
    endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : '',
    status: c.endDate ? (new Date(c.endDate) < new Date() ? 'expired' : 'active') : 'active',
    parseStatus: c.parseStatus,
    fileType: c.fileType || '',
    tags: c.tags ? JSON.parse(c.tags) : [],
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ code: 0, data: { list, total, page, pageSize } });
}

// POST: 创建合同
export async function POST(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const body = await request.json();

    const contract = await prisma.contract.create({
      data: {
        userId: identity.userId,
        identityType: identity.identityType,
        tenantId: identity.orgId,
        name: body.name || '未命名合同',
        type: body.type || '',
        partyA: body.partyA || '',
        partyB: body.partyB || '',
        amount: body.amount || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        fileUrl: body.fileUrl || '',
        fileType: body.fileType || '',
        ocrText: body.ocrText || '',
        source: body.source || 'UPLOAD',
        parseStatus: body.ocrText ? 'pending' : 'completed',
        tags: body.tags ? JSON.stringify(body.tags) : null,
        searchText: [body.name, body.partyA, body.partyB, body.tags?.join(' ')].filter(Boolean).join(' '),
      },
    });

    return NextResponse.json({ code: 0, message: '保存成功', data: contract });
  } catch (error) {
    return NextResponse.json({ code: 1, message: '保存失败', error: String(error) }, { status: 500 });
  }
}

// DELETE: 删除合同
export async function DELETE(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ code: 1, message: '缺少合同ID' }, { status: 400 });

    await prisma.contract.deleteMany({ where: { id, ...buildFilter(identity) } });
    return NextResponse.json({ code: 0, message: '合同已删除' });
  } catch (error) {
    return NextResponse.json({ code: 1, message: '删除失败' }, { status: 500 });
  }
}
