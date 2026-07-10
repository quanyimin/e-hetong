import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const uid = currentUser.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 当月营收（INCOME类型的账单已结清）
    const currentMonthIncome = await prisma.bill.aggregate({
      where: {
        type: 'INCOME',
        status: 'PAID',
        paidAt: { gte: monthStart, lte: monthEnd },
        contract: { userId: uid },
      },
      _sum: { amount: true },
    });

    // 当月支出
    const currentMonthExpense = await prisma.bill.aggregate({
      where: {
        type: 'EXPENSE',
        status: 'PAID',
        paidAt: { gte: monthStart, lte: monthEnd },
        contract: { userId: uid },
      },
      _sum: { amount: true },
    });

    // 上月营收（用于对比）
    const lastMonthIncome = await prisma.bill.aggregate({
      where: {
        type: 'INCOME',
        status: 'PAID',
        paidAt: { gte: lastMonthStart, lt: monthStart },
        contract: { userId: uid },
      },
      _sum: { amount: true },
    });

    const income = currentMonthIncome._sum.amount || 0;
    const expense = currentMonthExpense._sum.amount || 0;
    const lastIncome = lastMonthIncome._sum.amount || 0;

    // 最近交易记录
    const recentBills = await prisma.bill.findMany({
      where: {
        status: 'PAID',
        contract: { userId: uid },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
      select: { id: true, title: true, amount: true, type: true, paidAt: true, dueDate: true },
    });

    // 近6个月月度数据
    const monthlyData: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthIncome = await prisma.bill.aggregate({
        where: {
          type: 'INCOME',
          status: 'PAID',
          paidAt: { gte: m, lte: mEnd },
          contract: { userId: uid },
        },
        _sum: { amount: true },
      });
      const monthExpense = await prisma.bill.aggregate({
        where: {
          type: 'EXPENSE',
          status: 'PAID',
          paidAt: { gte: m, lte: mEnd },
          contract: { userId: uid },
        },
        _sum: { amount: true },
      });
      monthlyData.push({
        label: `${m.getMonth() + 1}月`,
        income: monthIncome._sum.amount || 0,
        expense: monthExpense._sum.amount || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        income,
        expense,
        profit: income - expense,
        lastIncome,
        incomeChange: lastIncome > 0 ? ((income - lastIncome) / lastIncome * 100).toFixed(1) : '0',
        recentBills,
        monthlyData,
      },
    });
  } catch (error) {
    console.error('[Finance API] Error:', error);
    return NextResponse.json({ success: false, data: null }, { status: 500 });
  }
}
