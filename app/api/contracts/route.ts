import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取合同列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const financialType = searchParams.get('financialType') || '';
  const status = searchParams.get('status') || '';

  if (!tenantId) {
    return NextResponse.json({ code: 1, message: '缺少tenantId参数' }, { status: 400 });
  }

  const currentUser = getCurrentUser(request);
  if (!currentUser) return unauthorized();
  const membership = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, tenantId },
  });
  if (!membership) return forbidden('您无权访问该主体');

  const where: any = { tenantId };
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
    const body = await request.json();
    const tenantId = body.tenantId;

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少tenantId' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    const contract = await prisma.contract.create({
      data: {
        userId: currentUser.id,
        name: body.name || '未命名合同',
        type: body.type || '',
        partyA: body.partyA || '',
        partyB: body.partyB || '',
        amount: body.amount || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        fileType: body.fileType || '',
        parseStatus: 'completed',
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!id) return NextResponse.json({ code: 1, message: '缺少合同ID' }, { status: 400 });
    if (!tenantId) return NextResponse.json({ code: 1, message: '缺少tenantId' }, { status: 400 });

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    await prisma.contract.deleteMany({ where: { id, userId: currentUser.id } });
    return NextResponse.json({ code: 0, message: '合同已删除' });
  } catch (error) {
    return NextResponse.json({ code: 1, message: '删除失败' }, { status: 500 });
  }
}
