import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/contracts/ledger — 合同台账统计看板
 *
 * 返回：
 *   - 收入/支出分类统计（月/年）
 *   - 合同类型分布
 *   - 未来7/15/30日到期提醒
 *   - 收支趋势
 */
export async function GET(request: NextRequest) {
  const { identity, error } = await requireOrgAccess(request);
  if (error) return error;

  const where = buildFilter(identity);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // 1. 本月收支统计
  const monthContracts = await prisma.contract.findMany({
    where: { ...where, createdAt: { gte: startOfMonth } },
    select: { direction: true, amount: true, status: true },
  });

  let monthIncome = 0, monthExpense = 0;
  monthContracts.forEach(c => {
    if (c.amount && c.status === 'ACTIVE') {
      if (c.direction === 'INCOME') monthIncome += c.amount;
      else if (c.direction === 'EXPENSE') monthExpense += c.amount;
    }
  });

  // 2. 本年收支统计
  const yearContracts = await prisma.contract.findMany({
    where: { ...where, createdAt: { gte: startOfYear } },
    select: { direction: true, amount: true, status: true },
  });

  let yearIncome = 0, yearExpense = 0;
  yearContracts.forEach(c => {
    if (c.amount && c.status === 'ACTIVE') {
      if (c.direction === 'INCOME') yearIncome += c.amount;
      else if (c.direction === 'EXPENSE') yearExpense += c.amount;
    }
  });

  // 3. 合同类型分布
  const typeStats = await prisma.contract.groupBy({
    by: ['type'],
    where,
    _count: true,
    _sum: { amount: true },
  });

  // 4. 到期提醒（7/15/30日）
  const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const day15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiring7 = await prisma.contract.findMany({
    where: { ...where, endDate: { gte: now, lte: day7 }, status: 'ACTIVE' },
    select: { id: true, name: true, partyA: true, partyB: true, endDate: true, amount: true, direction: true },
    orderBy: { endDate: 'asc' },
  });

  const expiring15 = await prisma.contract.findMany({
    where: { ...where, endDate: { gt: day7, lte: day15 }, status: 'ACTIVE' },
    select: { id: true, name: true, partyA: true, partyB: true, endDate: true, amount: true, direction: true },
    orderBy: { endDate: 'asc' },
  });

  const expiring30 = await prisma.contract.findMany({
    where: { ...where, endDate: { gt: day15, lte: day30 }, status: 'ACTIVE' },
    select: { id: true, name: true, partyA: true, partyB: true, endDate: true, amount: true, direction: true },
    orderBy: { endDate: 'asc' },
  });

  // 5. 近6个月收支趋势
  const monthlyTrend: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const mContracts = await prisma.contract.findMany({
      where: { ...where, createdAt: { gte: mStart, lte: mEnd }, status: 'ACTIVE' },
      select: { direction: true, amount: true },
    });
    let inc = 0, exp = 0;
    mContracts.forEach(c => {
      if (c.amount) {
        if (c.direction === 'INCOME') inc += c.amount;
        else if (c.direction === 'EXPENSE') exp += c.amount;
      }
    });
    monthlyTrend.push({
      month: `${mStart.getMonth() + 1}月`,
      income: inc,
      expense: exp,
    });
  }

  // 6. 全部合同统计
  const allContracts = await prisma.contract.aggregate({
    where,
    _count: true,
    _sum: { amount: true },
  });

  const statusStats = await prisma.contract.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: allContracts._count,
        totalAmount: allContracts._sum.amount || 0,
      },
      monthly: {
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
      },
      yearly: {
        income: yearIncome,
        expense: yearExpense,
        net: yearIncome - yearExpense,
      },
      typeDistribution: typeStats.map(t => ({
        type: t.type || 'other',
        count: t._count,
        amount: t._sum.amount || 0,
      })),
      statusDistribution: statusStats.map(s => ({
        status: s.status,
        count: s._count,
      })),
      expiring: {
        days7: expiring7,
        days15: expiring15,
        days30: expiring30,
      },
      trend: monthlyTrend,
    },
  });
}
