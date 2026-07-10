import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const { userId, name, email, phone } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: '未指定用户' });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, error: '更新失败' });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: '未指定用户' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, memberLevel: true },
    });
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: '查询失败' });
  } finally {
    await prisma.$disconnect();
  }
}
