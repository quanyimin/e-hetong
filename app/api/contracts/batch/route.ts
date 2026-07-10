import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '请选择要删除的合同' }, { status: 400 });
    }
    await prisma.contract.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: '批量删除失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
