import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取台账数据（汇总统计 + 月度明细 + 合同级明细）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const financialType = searchParams.get('financialType') || '';  // INCOME / EXPENSE / 空(全部)

  if (!tenantId) {
    return NextResponse.json({ code: 1, message: '缺少tenantId参数' }, { status: 400 });
  }

  const currentUser = getCurrentUser(request);
  if (!currentUser) return unauthorized();
  const membership = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, tenantId },
  });
  if (!membership) return forbidden('您无权访问该主体');

  try {
    // 1. 查询合同（含财务类型）
    const contractWhere: any = { tenantId };
    if (financialType) contractWhere.financialType = financialType;

    const contracts = await prisma.contract.findMany({
      where: contractWhere,
      include: {
        partner: { select: { name: true } },
        bills: {
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            type: true,
            title: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            lateFee: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. 计算汇总统计
    let totalIncome = 0;
    let totalExpense = 0;
    let paidIncome = 0;
    let paidExpense = 0;

    const monthlyMap: Record<string, {
      incomeAmount: number;
      expenseAmount: number;
      incomePaid: number;
      expensePaid: number;
      contractCount: number;
    }> = {};

    // 3. 构建合同级明细
    const contractDetails = contracts.map((c) => {
      const isIncome = c.financialType === 'INCOME';
      const isExpense = c.financialType === 'EXPENSE';
      const contractTotal = c.amount || 0;

      if (isIncome) totalIncome += contractTotal;
      if (isExpense) totalExpense += contractTotal;

      let contractPaid = 0;

      const bills = c.bills.map((b) => {
        if (isIncome) paidIncome += b.paidAmount;
        if (isExpense) paidExpense += b.paidAmount;
        contractPaid += b.paidAmount;

        // 按月份聚合（无到期日期的跳过月份统计）
        if (b.dueDate) {
          const monthKey = `${b.dueDate.getFullYear()}-${String(b.dueDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = { incomeAmount: 0, expenseAmount: 0, incomePaid: 0, expensePaid: 0, contractCount: 0 };
          }
          if (isIncome) {
            monthlyMap[monthKey].incomeAmount += b.amount;
            monthlyMap[monthKey].incomePaid += b.paidAmount;
          }
          if (isExpense) {
            monthlyMap[monthKey].expenseAmount += b.amount;
            monthlyMap[monthKey].expensePaid += b.paidAmount;
          }
        }

        return {
          id: b.id,
          title: b.title,
          amount: b.amount,
          paidAmount: b.paidAmount,
          dueDate: b.dueDate ? b.dueDate.toISOString().split('T')[0] : '',
          status: b.status,
          lateFee: b.lateFee,
        };
      });

      // 合同维度统计合同数（去重）
      bills.forEach(() => {
        const monthKey = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].contractCount += 1;
        }
      });

      return {
        id: c.id,
        name: c.name,
        financialType: c.financialType || 'OTHER',
        amount: contractTotal,
        paidAmount: contractPaid,
        pendingAmount: contractTotal - contractPaid,
        partnerName: c.partner?.name || c.partyB,
        bills,
      };
    });

    // 4. 按月排序
    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        incomeAmount: data.incomeAmount,
        expenseAmount: data.expenseAmount,
        incomePaid: data.incomePaid,
        expensePaid: data.expensePaid,
        incomePending: data.incomeAmount - data.incomePaid,
        expensePending: data.expenseAmount - data.expensePaid,
        contractCount: data.contractCount,
      }));

    return NextResponse.json({
      code: 0,
      data: {
        summary: {
          totalIncome,
          totalExpense,
          paidIncome,
          paidExpense,
          pendingIncome: totalIncome - paidIncome,
          pendingExpense: totalExpense - paidExpense,
        },
        monthly,
        contracts: contractDetails,
      },
    });
  } catch (error) {
    console.error('[台账API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取台账数据失败' }, { status: 500 });
  }
}
