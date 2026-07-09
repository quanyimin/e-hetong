import prisma from '@/lib/prisma';
import { validateTenantAccess, hasPermission } from '../data-isolation';
import { addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { createManualReminder } from '../reminder-service';

export interface RentBill {
  id: string;
  tenantId: string;
  contractId: string;
  contractName: string;
  partnerName: string;
  amount: number;
  dueDate: Date;
  paidAmount: number;
  status: string;
  lateFee: number | null;
  remark: string | null;
}

export interface CreateRentBillParams {
  contractId: string;
  amount: number;
  dueDate: string;
  remark?: string;
}

export async function generateRentBillsForContract(
  userId: string,
  tenantId: string,
  contractId: string
): Promise<{ success: boolean; error?: string; createdCount?: number }> {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'ADMIN')) {
    return { success: false, error: '无权限操作' };
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { partner: { select: { id: true, name: true } } },
  });

  if (!contract || !contract.startDate || !contract.endDate) {
    return { success: false, error: '合同信息不完整' };
  }

  const sceneConfig = contract.sceneConfig ? JSON.parse(contract.sceneConfig) : {};
  const rentAmount = sceneConfig.rentAmount || contract.amount || 0;
  const paymentDay = sceneConfig.paymentDay || 1;
  const paymentCycle = sceneConfig.paymentCycle || 'month';

  if (rentAmount <= 0) {
    return { success: false, error: '租金金额无效' };
  }

  let createdCount = 0;
  let currentDate = startOfMonth(contract.startDate);
  const endDate = endOfMonth(contract.endDate);

  while (currentDate <= endDate) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), paymentDay);

    const existingBill = await prisma.bill.findFirst({
      where: { contractId, tenantId, dueDate },
    });

    if (!existingBill) {
      await prisma.bill.create({
        data: {
          tenantId,
          contractId,
          partnerId: contract.partnerId,
          type: 'RENT',
          title: `${contract.name} - ${formatDate(dueDate)}租金`,
          amount: rentAmount,
          dueDate,
          status: 'PENDING',
          lateFee: sceneConfig.lateFeeRate ? rentAmount * (sceneConfig.lateFeeRate / 100) : null,
        },
      });

      await createManualReminder({
        userId,
        tenantId,
        contractId,
        remindAt: addMonths(dueDate, -1),
        remindType: 'custom',
        title: `租金提醒：${contract.name}`,
        message: `${contract.partner?.name || ''}的租金 ${formatAmount(rentAmount)} 将于 ${formatDate(dueDate)} 到期，请提前准备收款。`,
      }).catch(() => {});

      createdCount++;
    }

    if (paymentCycle === 'month') {
      currentDate = addMonths(currentDate, 1);
    } else if (paymentCycle === 'quarter') {
      currentDate = addMonths(currentDate, 3);
    } else if (paymentCycle === 'year') {
      currentDate = addMonths(currentDate, 12);
    } else {
      currentDate = addMonths(currentDate, 1);
    }
  }

  return { success: true, createdCount };
}

export async function getRentBills(
  userId: string,
  tenantId: string,
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    partnerId?: string;
    contractId?: string;
  }
): Promise<{
  data: RentBill[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await validateTenantAccess(userId, tenantId);

  const { page = 1, pageSize = 20, status, partnerId, contractId } = params || {};

  const where: any = { tenantId, type: 'RENT' };
  if (status) where.status = status;
  if (partnerId) where.partnerId = partnerId;
  if (contractId) where.contractId = contractId;

  const [total, bills] = await Promise.all([
    prisma.bill.count({ where }),
    prisma.bill.findMany({
      where,
      include: {
        contract: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const result: RentBill[] = bills.map((bill) => ({
    id: bill.id,
    tenantId: bill.tenantId || '',
    contractId: bill.contractId || '',
    contractName: bill.contract?.name || '',
    partnerName: bill.partner?.name || '',
    amount: bill.amount,
    dueDate: bill.dueDate || new Date(),
    paidAmount: bill.paidAmount,
    status: bill.status,
    lateFee: bill.lateFee,
    remark: bill.remark,
  }));

  return { data: result, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getRentStats(userId: string, tenantId: string) {
  await validateTenantAccess(userId, tenantId);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const [totalBills, paidBills, pendingBills, totalAmount, paidAmount] = await Promise.all([
    prisma.bill.count({ where: { tenantId, type: 'RENT' } }),
    prisma.bill.count({ where: { tenantId, type: 'RENT', status: 'PAID' } }),
    prisma.bill.count({ where: { tenantId, type: 'RENT', status: 'PENDING' } }),
    prisma.bill.aggregate({ where: { tenantId, type: 'RENT' }, _sum: { amount: true } }),
    prisma.bill.aggregate({ where: { tenantId, type: 'RENT', status: 'PAID' }, _sum: { paidAmount: true } }),
  ]);

  const currentMonthStats = await prisma.bill.aggregate({
    where: {
      tenantId,
      type: 'RENT',
      dueDate: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true, paidAmount: true },
    _count: { id: true },
  });

  const overdueBills = await prisma.bill.count({
    where: {
      tenantId,
      type: 'RENT',
      status: 'PENDING',
      dueDate: { lt: now },
    },
  });

  return {
    totalBills,
    paidBills,
    pendingBills,
    overdueBills,
    totalAmount: totalAmount._sum.amount || 0,
    paidAmount: paidAmount._sum.paidAmount || 0,
    currentMonthAmount: currentMonthStats._sum.amount || 0,
    currentMonthPaid: currentMonthStats._sum.paidAmount || 0,
    currentMonthCount: currentMonthStats._count.id,
    collectionRate: totalAmount._sum.amount ? ((paidAmount._sum.paidAmount || 0) / (totalAmount._sum.amount || 1)) * 100 : 0,
  };
}

export async function updateBillPayment(
  userId: string,
  tenantId: string,
  billId: string,
  paidAmount: number
): Promise<{ success: boolean; error?: string }> {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'MANAGER')) {
    return { success: false, error: '无权限操作' };
  }

  const bill = await prisma.bill.findFirst({ where: { id: billId, tenantId } });
  if (!bill) return { success: false, error: '账单不存在' };

  const newPaidAmount = bill.paidAmount + paidAmount;
  const status = newPaidAmount >= bill.amount ? 'PAID' : 'PARTIAL';

  await prisma.bill.update({
    where: { id: billId },
    data: { paidAmount: newPaidAmount, status },
  });

  return { success: true };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN')}`;
}