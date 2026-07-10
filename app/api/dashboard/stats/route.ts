import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';
import { startOfMonth, endOfMonth, subMonths, format, addDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [totalContracts, expiringCount, thisMonthUploads] = await Promise.all([
      prisma.contract.count({ where: { ...buildFilter(identity) } }),
      prisma.contract.count({
        where: {
          ...buildFilter(identity),
          endDate: {
            gte: now,
            lte: addDays(now, 30),
          },
        },
      }),
      prisma.contract.count({
        where: {
          ...buildFilter(identity),
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    const pendingReminders = await prisma.reminder.count({ where: { ...buildFilter(identity), sendStatus: 'PENDING' } });

    // 2. 合同类型分布
    const contracts = await prisma.contract.findMany({
      where: { ...buildFilter(identity) },
      select: { type: true, amount: true, endDate: true, createdAt: true },
    });

    const typeDistribution: Record<string, number> = {};
    for (const c of contracts) {
      const t = c.type || 'other';
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    }

    // 3. 月度趋势（近6个月）
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const count = await prisma.contract.count({
        where: { ...buildFilter(identity), createdAt: { gte: start, lte: end } },
      });
      monthlyTrend.push({ month: format(m, 'yyyy-MM'), count });
    }

    // 4. 合同状态分布
    const active = contracts.filter(c => c.endDate && c.endDate > now).length;
    const expired = contracts.filter(c => c.endDate && c.endDate <= now).length;
    const noDate = contracts.filter(c => !c.endDate).length;
    const expiring = contracts.filter(c => c.endDate && c.endDate > now && c.endDate <= addDays(now, 30)).length;

    // 5. 总金额
    const totalAmount = contracts.reduce((sum, c) => sum + (c.amount || 0), 0);

    // 6. 最近合同
    const recentContracts = await prisma.contract.findMany({
      where: { ...buildFilter(identity) },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true, name: true, partyA: true, amount: true, endDate: true, type: true, fileType: true, parseStatus: true, createdAt: true,
      },
    });

    // 7. 待办提醒
    const upcomingReminders = await prisma.reminder.findMany({
      where: { ...buildFilter(identity), sendStatus: 'PENDING' },
      orderBy: { remindAt: 'asc' },
      take: 5,
      include: { contract: { select: { id: true, name: true } } },
    });

    // 格式化最近合同
    const formattedContracts = recentContracts.map((c) => {
      const status = c.endDate
        ? (c.endDate < now ? 'expired' : c.endDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 ? 'expiring' : 'active')
        : 'active';
      return {
        id: c.id, name: c.name, partyA: c.partyA || '', amount: c.amount, status,
        endDate: c.endDate ? format(c.endDate, 'yyyy-MM-dd') : '', type: c.type, fileType: c.fileType, parseStatus: c.parseStatus,
      };
    });

    // 格式化提醒
    const formattedReminders = upcomingReminders.map((r) => ({
      id: r.id, title: r.title || '', contractId: r.contractId || '',
      contractName: r.contract?.name || '',
      date: format(r.remindAt, 'yyyy-MM-dd'), remindType: r.remindType,
    }));

    // 合同使用量（免费版限制）
    const contractLimit = 20;
    const contractUsage = totalContracts;

    return NextResponse.json({
      code: 0,
      data: {
        totalContracts,
        expiringCount,
        thisMonthUploads,
        pendingReminders,
        contractUsage,
        contractLimit,
        totalAmount,
        activeContracts: active,
        expiredCount: expired,
        noDateCount: noDate,
        typeDistribution,
        monthlyTrend,
        recentContracts: formattedContracts,
        upcomingReminders: formattedReminders,
      },
    });
  } catch (error) {
    console.error('[看板API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取统计数据失败' }, { status: 500 });
  }
}
