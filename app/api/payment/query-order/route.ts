import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const orderNo = request.nextUrl.searchParams.get('orderNo');
    if (!orderNo) {
      return NextResponse.json({ code: 1, message: '缺少订单号' }, { status: 400 });
    }
    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: { id: true, orderNo: true, planType: true, amount: true, paymentStatus: true, paidAt: true, expireAt: true, createdAt: true },
    });
    if (!order) {
      return NextResponse.json({ code: 1, message: '订单不存在' }, { status: 404 });
    }
    return NextResponse.json({ code: 0, message: '查询成功', data: order });
  } catch (error) {
    return NextResponse.json({ code: 1, message: '查询失败', error: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}
