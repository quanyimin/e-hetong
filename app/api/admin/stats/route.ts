import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const isAdmin = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!isAdmin) {
      return NextResponse.json({ code: 1, message: '需要管理员权限' }, { status: 403 });
    }
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [totalUsers, todayNewUsers, totalContracts, expiringContracts, totalOrders, paidUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.contract.count(),
      prisma.contract.count({ where: { endDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.order.count(),
      prisma.user.count({ where: { memberLevel: { not: 'free' } } }),
    ]);

    const paidOrders = await prisma.order.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd }, paymentStatus: 'paid' },
      select: { amount: true },
    });
    const monthlyRevenue = paidOrders.reduce((s, o) => s + Number(o.amount), 0);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, name: true, email: true, phone: true, memberLevel: true, createdAt: true },
    });

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { user: { select: { name: true } } },
    });

    const [activeContracts, expiredContracts] = await Promise.all([
      prisma.contract.count({ where: { endDate: { gt: now } } }),
      prisma.contract.count({ where: { endDate: { lte: now } } }),
    ]);

    const [parseCompleted, parseFailed, parsePending] = await Promise.all([
      prisma.contract.count({ where: { parseStatus: 'completed' } }),
      prisma.contract.count({ where: { parseStatus: 'failed' } }),
      prisma.contract.count({ where: { parseStatus: { in: ['pending', 'processing'] } } }),
    ]);

    return NextResponse.json({
      code: 0,
      data: {
        totalUsers, todayNewUsers, totalContracts, monthlyRevenue,
        expiringContracts, paidUsers, totalOrders,
        activeContracts, expiredContracts,
        parseCompleted, parseFailed, parsePending,
        recentUsers: recentUsers.map(u => ({
          id: u.id, name: u.name || '未知', email: u.email || u.phone || '',
          level: u.memberLevel, date: u.createdAt.toISOString().split('T')[0],
        })),
        recentOrders: recentOrders.map(o => ({
          id: o.id, orderNo: o.orderNo, user: o.user.name || '未知',
          amount: o.amount, status: o.paymentStatus, date: o.createdAt.toISOString().split('T')[0],
        })),
      },
    });
  } catch (error) {
    console.error('[管理后台API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取统计数据失败' }, { status: 500 });
  }
}
