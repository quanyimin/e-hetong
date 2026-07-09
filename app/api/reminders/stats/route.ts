import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取提醒统计（按租户隔离）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少tenantId参数' }, { status: 400 });
    }

    // 数据隔离校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    // 数据库中 sendStatus 存储为大写
    const [pending, sent, failed, total] = await Promise.all([
      prisma.reminder.count({ where: { tenantId, sendStatus: 'PENDING' } }),
      prisma.reminder.count({ where: { tenantId, sendStatus: 'SENT' } }),
      prisma.reminder.count({ where: { tenantId, sendStatus: 'FAILED' } }),
      prisma.reminder.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({ code: 0, data: { pending, sent, failed, total } });
  } catch (error) {
    console.error('[提醒统计API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取统计失败' }, { status: 500 });
  }
}
