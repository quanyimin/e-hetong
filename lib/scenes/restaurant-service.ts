import prisma from '@/lib/prisma';
import { validateTenantAccess, hasPermission } from '../data-isolation';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

export interface SupplierContract {
  id: string;
  name: string;
  supplierName: string;
  supplierPhone: string;
  category: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  status: string;
  paymentCycle: string;
  nextPaymentDate: Date | null;
}

export interface MonthlyPaymentSummary {
  month: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentCount: number;
  suppliers: { id: string; name: string; amount: number; paid: boolean }[];
}

export async function getSupplierContracts(
  userId: string,
  tenantId: string,
  params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: string;
  }
): Promise<{
  data: SupplierContract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await validateTenantAccess(userId, tenantId);

  const { page = 1, pageSize = 20, category, status } = params || {};

  const where: any = { tenantId, type: 'supplier' };
  if (category) where.category = category;
  if (status) where.status = status;

  const [total, contracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: { partner: { select: { id: true, name: true, phone: true } } },
      orderBy: { endDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const result: SupplierContract[] = await Promise.all(
    contracts.map(async (contract) => {
      const sceneConfig = contract.sceneConfig ? JSON.parse(contract.sceneConfig) : {};
      const nextPaymentDate = await calculateNextPaymentDate(contract, sceneConfig);

      return {
        id: contract.id,
        name: contract.name,
        supplierName: contract.partner?.name || '',
        supplierPhone: contract.partner?.phone || '',
        category: sceneConfig.category || contract.category || '食材',
        amount: contract.amount || 0,
        startDate: contract.startDate || new Date(),
        endDate: contract.endDate || new Date(),
        status: contract.status,
        paymentCycle: sceneConfig.paymentCycle || 'month',
        nextPaymentDate,
      };
    })
  );

  return { data: result, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function calculateNextPaymentDate(contract: any, sceneConfig: any): Promise<Date | null> {
  if (!contract.startDate) return null;

  const paymentDay = sceneConfig.paymentDay || 15;
  const cycle = sceneConfig.paymentCycle || 'month';
  const today = new Date();

  let nextDate = new Date(contract.startDate.getFullYear(), contract.startDate.getMonth(), paymentDay);
  while (nextDate < today) {
    if (cycle === 'month') {
      nextDate = addMonths(nextDate, 1);
    } else if (cycle === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (cycle === 'quarter') {
      nextDate = addMonths(nextDate, 3);
    }
  }

  if (contract.endDate && nextDate > contract.endDate) {
    return null;
  }

  return nextDate;
}

export async function getMonthlyPaymentPlan(
  userId: string,
  tenantId: string,
  month?: string
): Promise<MonthlyPaymentSummary> {
  await validateTenantAccess(userId, tenantId);

  const targetDate = month ? new Date(month) : new Date();
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const bills = await prisma.bill.findMany({
    where: {
      tenantId,
      type: 'PURCHASE',
      dueDate: { gte: monthStart, lte: monthEnd },
    },
    include: { partner: { select: { id: true, name: true } } },
  });

  const supplierMap = new Map<string, { amount: number; paid: boolean }>();
  let totalAmount = 0;
  let paidAmount = 0;

  for (const bill of bills) {
    totalAmount += bill.amount;
    paidAmount += bill.paidAmount;

    const supplierId = bill.partnerId || 'unknown';
    const existing = supplierMap.get(supplierId) || { amount: 0, paid: false };
    supplierMap.set(supplierId, {
      amount: existing.amount + bill.amount,
      paid: existing.paid || bill.status === 'PAID',
    });
  }

  const suppliers = await Promise.all(
    Array.from(supplierMap.entries()).map(async ([id, data]) => {
      if (id === 'unknown') {
        return { id, name: '未知供应商', amount: data.amount, paid: data.paid };
      }
      const partner = await prisma.partner.findUnique({ where: { id } });
      return { id, name: partner?.name || '未知', amount: data.amount, paid: data.paid };
    })
  );

  return {
    month: format(targetDate, 'yyyy年MM月', { locale: zhCN }),
    totalAmount,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
    paymentCount: bills.length,
    suppliers,
  };
}

export async function getIngredientCategories(userId: string, tenantId: string) {
  await validateTenantAccess(userId, tenantId);

  const categories = ['蔬菜类', '肉类', '海鲜类', '粮油类', '调料类', '酒水类', '其他'];

  const stats = await Promise.all(
    categories.map(async (cat) => {
      const count = await prisma.contract.count({
        where: {
          tenantId,
          type: 'supplier',
          category: cat,
        },
      });
      return { name: cat, count };
    })
  );

  return stats;
}

export async function generateMonthlyBills(
  userId: string,
  tenantId: string,
  month?: string
): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'ADMIN')) {
    return { success: false, error: '无权限操作' };
  }

  const targetDate = month ? new Date(month) : new Date();
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const contracts = await prisma.contract.findMany({
    where: {
      tenantId,
      type: 'supplier',
      status: 'ACTIVE',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { partner: { select: { id: true, name: true } } },
  });

  let createdCount = 0;

  for (const contract of contracts) {
    const sceneConfig = contract.sceneConfig ? JSON.parse(contract.sceneConfig) : {};
    const paymentDay = sceneConfig.paymentDay || 15;
    const amount = sceneConfig.monthlyAmount || contract.amount || 0;

    if (amount <= 0) continue;

    const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), paymentDay);

    const existing = await prisma.bill.findFirst({
      where: { tenantId, contractId: contract.id, dueDate, type: 'PURCHASE' },
    });

    if (!existing) {
      await prisma.bill.create({
        data: {
          tenantId,
          contractId: contract.id,
          partnerId: contract.partnerId,
          type: 'PURCHASE',
          title: `${contract.partner?.name || ''} - ${format(targetDate, 'yyyy年MM月', { locale: zhCN })}货款`,
          amount,
          dueDate,
          status: 'PENDING',
        },
      });
      createdCount++;
    }
  }

  return { success: true, createdCount };
}

export async function getRestaurantStats(userId: string, tenantId: string) {
  await validateTenantAccess(userId, tenantId);

  const [totalSuppliers, activeContracts, expiredContracts, totalAmount] = await Promise.all([
    prisma.partner.count({ where: { tenantId, type: 'supplier' } }),
    prisma.contract.count({ where: { tenantId, type: 'supplier', status: 'ACTIVE' } }),
    prisma.contract.count({ where: { tenantId, type: 'supplier', status: 'EXPIRED' } }),
    prisma.contract.aggregate({ where: { tenantId, type: 'supplier' }, _sum: { amount: true } }),
  ]);

  const today = new Date();
  const nextMonthStart = startOfMonth(addMonths(today, 1));
  const nextMonthEnd = endOfMonth(addMonths(today, 1));

  const upcomingPayments = await prisma.bill.aggregate({
    where: {
      tenantId,
      type: 'PURCHASE',
      status: { not: 'PAID' },
      dueDate: { gte: today, lte: nextMonthEnd },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    totalSuppliers,
    activeContracts,
    expiredContracts,
    totalContractAmount: totalAmount._sum.amount || 0,
    upcomingPaymentAmount: upcomingPayments._sum.amount || 0,
    upcomingPaymentCount: upcomingPayments._count.id,
  };
}