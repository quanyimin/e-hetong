import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMonthlyPaymentPlan } from '@/lib/scenes/restaurant-service';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tenantId = searchParams.get('tenantId');
    const month = searchParams.get('month');

    if (!userId || !tenantId) {
      return NextResponse.json({ success: false, error: '缺少参数' });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    const plan = await getMonthlyPaymentPlan(userId, tenantId, month || undefined);

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : '获取失败' });
  }
}