import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

export async function DELETE(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '请选择要删除的合同' }, { status: 400 });
    }
    await prisma.contract.deleteMany({ where: { id: { in: ids }, ...buildFilter(identity) } });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: '批量删除失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
