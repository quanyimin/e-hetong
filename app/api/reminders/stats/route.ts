import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET: 获取提醒统计（按身份隔离）
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    // 数据库中 sendStatus 存储为大写
    const [pending, sent, failed, total] = await Promise.all([
      prisma.reminder.count({ where: { ...buildFilter(identity), sendStatus: 'PENDING' } }),
      prisma.reminder.count({ where: { ...buildFilter(identity), sendStatus: 'SENT' } }),
      prisma.reminder.count({ where: { ...buildFilter(identity), sendStatus: 'FAILED' } }),
      prisma.reminder.count({ where: { ...buildFilter(identity) } }),
    ]);

    return NextResponse.json({ code: 0, data: { pending, sent, failed, total } });
  } catch (error) {
    console.error('[提醒统计API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取统计失败' }, { status: 500 });
  }
}
