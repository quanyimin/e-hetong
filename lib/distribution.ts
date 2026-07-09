/**
 * ===========================================
 * 分销裂变核心逻辑
 * ===========================================
 * 功能：
 * 1. 邀请码生成与注册绑定
 * 2. 新用户注册赠送 5 份合同，邀请人获得 10 份
 * 3. 分销商/代理商等级管理
 * 4. 佣金计算与结算
 * 5. 客户关联管理
 */

import prisma from '@/lib/prisma';
import { generateOrderNo } from '@/lib/utils';

// ===========================================
// 常量配置
// ===========================================

/** 新用户注册奖励合同数 */
export const SIGNUP_BONUS_CONTRACTS = 5;
/** 邀请人获得奖励合同数 */
export const INVITER_BONUS_VIP_MONTHS = 1;/** 邀请人获得VIP月数 */
export const INVITER_BONUS_CONTRACTS = 10;

/** 佣金分成比例 */
export const COMMISSION_RATES = {
  distributor: 0.15, // 分销商 15%
  agent: 0.25,       // 代理商 25%
};

/** 最低提现金额 */
export const MIN_WITHDRAWAL = 100;

/** 分销等级 */
export type DistributorLevel = 'none' | 'distributor' | 'agent';

// ===========================================
// 邀请码工具
// ===========================================

/**
 * 生成唯一邀请码
 * 格式：8位字母数字组合，大写
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 0/O/1/I
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 为用户生成邀请码（如无则生成）
 */
export async function ensureInviteCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });

  if (user?.inviteCode) return user.inviteCode;

  // 生成不重复的邀请码
  let code: string;
  let exists = true;
  do {
    code = generateInviteCode();
    const existing = await prisma.user.findUnique({ where: { inviteCode: code } });
    exists = !!existing;
  } while (exists);

  await prisma.user.update({
    where: { id: userId },
    data: { inviteCode: code },
  });

  return code;
}

// ===========================================
// 注册裂变逻辑
// ===========================================

/**
 * 处理新用户注册时的裂变奖励
 * @param newUserId 新用户 ID
 * @param inviteCode 邀请码（可选）
 */
export async function handleSignupBonus(
  newUserId: string,
  inviteCode?: string | null
): Promise<{ bonusContracts: number; inviterBonus?: number }> {
  // 1. 新用户获得 5 份合同奖励
  await prisma.user.update({
    where: { id: newUserId },
    data: { contractBonus: { increment: SIGNUP_BONUS_CONTRACTS } },
  });

  // 2. 如果有邀请码，查找邀请人
  if (inviteCode) {
    const inviter = await prisma.user.findUnique({
      where: { inviteCode },
      select: { id: true, name: true },
    });

    if (inviter && inviter.id !== newUserId) {
      // 记录邀请关系
      await prisma.user.update({
        where: { id: newUserId },
        data: { invitedBy: inviter.id },
      });

      // 邀请人获得 10 份合同奖励 + 1个月VIP
      await prisma.user.update({
        where: { id: inviter.id },
        data: {
            contractBonus: { increment: INVITER_BONUS_CONTRACTS },
            vipMonths: { increment: INVITER_BONUS_VIP_MONTHS },
          },
      });

      // 如果是分销商/代理商，自动建立客户关系
      const inviterDist = await prisma.user.findUnique({
        where: { id: inviter.id },
        select: { distributorLevel: true },
      });

      if (inviterDist && inviterDist.distributorLevel !== 'none') {
        await addCustomerRelation(inviter.id, newUserId);
      }

      return { bonusContracts: SIGNUP_BONUS_CONTRACTS, inviterBonus: INVITER_BONUS_CONTRACTS };
    }
  }

  return { bonusContracts: SIGNUP_BONUS_CONTRACTS };
}

/**
 * 获取用户的有效合同上限（含奖励）
 */
export async function getUserContractLimit(userId: string): Promise<{
  baseLimit: number;
  bonus: number;
  totalLimit: number;
  isPro: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { memberLevel: true, contractBonus: true },
  });

  if (!user) return { baseLimit: 20, bonus: 0, totalLimit: 20, isPro: false };

  // 年度会员无限
  if (user.memberLevel === 'pro') {
    return { baseLimit: -1, bonus: 0, totalLimit: -1, isPro: true };
  }

  const baseLimit = 20; // 免费版基础 20 份
  const totalLimit = baseLimit + (user.contractBonus || 0);

  return { baseLimit, bonus: user.contractBonus || 0, totalLimit, isPro: false };
}

// ===========================================
// 分销商/代理商管理
// ===========================================

/**
 * 提升用户为分销商
 */
export async function upgradeToDistributor(
  userId: string,
  level: DistributorLevel,
  duration: number = 365
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const expireAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        distributorLevel: level,
        distributorSince: now,
        distributorExpire: expireAt,
        role: level === 'agent' ? 'agent' : 'distributor',
      },
    });

    // 确保有邀请码
    await ensureInviteCode(userId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '升级失败' };
  }
}

/**
 * 降级分销商
 */
export async function downgradeDistributor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      distributorLevel: 'none',
      role: 'user',
      distributorExpire: null,
    },
  });
}

// ===========================================
// 客户关联管理
// ===========================================

/**
 * 添加客户关联
 */
export async function addCustomerRelation(
  distributorId: string,
  customerId: string,
  rate?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.distributorCustomer.create({
      data: {
        distributorId,
        customerId,
        commissionRate: rate,
      },
    });
    return { success: true };
  } catch (error) {
    if ((error as any)?.code === 'P2002') {
      return { success: false, error: '客户已存在关联' };
    }
    return { success: false, error: error instanceof Error ? error.message : '添加失败' };
  }
}

/**
 * 获取分销商的客户列表
 */
export async function getDistributorCustomers(params: {
  distributorId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { distributorId, page = 1, pageSize = 20, search } = params;

  const where: any = { distributorId };
  if (search) {
    where.customer = {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  const [total, items] = await Promise.all([
    prisma.distributorCustomer.count({ where }),
    prisma.distributorCustomer.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true, memberLevel: true, createdAt: true, contractBonus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { list: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ===========================================
// 佣金管理
// ===========================================

/**
 * 订单支付成功后计算分销佣金
 */
export async function calculateCommission(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { id: true, invitedBy: true },
      },
    },
  });

  if (!order || order.paymentStatus !== 'paid') return;

  const customerId = order.userId;

  // 查找用户所属的分销商/代理商（通过客户关联或邀请关系）
  const distributorRelation = await prisma.distributorCustomer.findFirst({
    where: { customerId },
    include: {
      distributor: { select: { id: true, distributorLevel: true } },
    },
  });

  let distributorId: string | null = null;
  let commissionRate = 0;

  if (distributorRelation && distributorRelation.distributor.distributorLevel !== 'none') {
    distributorId = distributorRelation.distributorId;
    const distLevel = distributorRelation.distributor.distributorLevel as DistributorLevel;
    const rate1 = distributorRelation.commissionRate ?? COMMISSION_RATES[distLevel as keyof typeof COMMISSION_RATES] ?? 0;
    commissionRate = rate1;
  } else if (order.user.invitedBy) {
    // 通过邀请关系找上级
    const inviter = await prisma.user.findUnique({
      where: { id: order.user.invitedBy },
      select: { id: true, distributorLevel: true },
    });
    if (inviter && inviter.distributorLevel !== 'none') {
      distributorId = inviter.id;
      const inviterLevel = inviter.distributorLevel as keyof typeof COMMISSION_RATES;
      commissionRate = COMMISSION_RATES[inviterLevel] ?? 0;
    }
  }

  if (!distributorId || commissionRate <= 0) return;

  const commissionAmt = Math.round(order.amount * commissionRate * 100) / 100;

  // 创建佣金记录
  await prisma.commission.create({
    data: {
      orderId: order.id,
      distributorId,
      customerId,
      orderAmount: order.amount,
      commissionRate,
      commissionAmt,
      status: 'pending',
    },
  });

  // 更新分销商累计收益
  await prisma.user.update({
    where: { id: distributorId },
    data: {
      totalEarned: { increment: commissionAmt },
      withdrawable: { increment: commissionAmt },
    },
  });
}

/**
 * 结算佣金（标记为已结算）
 */
export async function settleCommission(commissionId: string): Promise<void> {
  await prisma.commission.update({
    where: { id: commissionId },
    data: { status: 'settled', settledAt: new Date() },
  });
}

// ===========================================
// 提现管理
// ===========================================

/**
 * 创建提现申请
 */
export async function createWithdrawal(params: {
  userId: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  accountName: string;
}): Promise<{ success: boolean; error?: string; withdrawalId?: string }> {
  if (params.amount < MIN_WITHDRAWAL) {
    return { success: false, error: `最低提现金额为 ¥${MIN_WITHDRAWAL}` };
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { withdrawable: true },
  });

  if (!user || user.withdrawable < params.amount) {
    return { success: false, error: '可提现余额不足' };
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      bankName: params.bankName,
      bankAccount: params.bankAccount,
      accountName: params.accountName,
    },
  });

  // 冻结余额
  await prisma.user.update({
    where: { id: params.userId },
    data: { withdrawable: { decrement: params.amount } },
  });

  return { success: true, withdrawalId: withdrawal.id };
}

/**
 * 审核提现
 */
export async function approveWithdrawal(
  withdrawalId: string,
  approved: boolean,
  remark?: string
): Promise<void> {
  if (approved) {
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'approved', approvedAt: new Date(), remark },
    });
  } else {
    // 拒绝则退回余额
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (withdrawal) {
      await prisma.user.update({
        where: { id: withdrawal.userId },
        data: { withdrawable: { increment: withdrawal.amount } },
      });
    }
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'rejected', remark },
    });
  }
}

/**
 * 确认提现完成
 */
export async function completeWithdrawal(withdrawalId: string): Promise<void> {
  await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: 'completed', completedAt: new Date() },
  });
}

// ===========================================
// 分销统计
// ===========================================

export async function getDistributorStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      distributorLevel: true,
      contractBonus: true,
      totalEarned: true,
      withdrawable: true,
    },
  });

  const [customerCount, commissionCount, pendingCommissions, totalCommissions] = await Promise.all([
    prisma.distributorCustomer.count({ where: { distributorId: userId } }),
    prisma.commission.count({ where: { distributorId: userId } }),
    prisma.commission.count({ where: { distributorId: userId, status: 'pending' } }),
    prisma.commission.aggregate({
      where: { distributorId: userId, status: { not: 'pending' } },
      _sum: { commissionAmt: true },
    }),
  ]);

  return {
    level: user?.distributorLevel || 'none',
    contractBonus: user?.contractBonus || 0,
    totalEarned: user?.totalEarned || 0,
    withdrawable: user?.withdrawable || 0,
    customerCount,
    commissionCount,
    pendingCommissions,
    settledTotal: totalCommissions._sum.commissionAmt || 0,
  };
}
