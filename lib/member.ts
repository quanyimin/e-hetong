/**
 * ===========================================
 * 会员权益与权限校验
 * ===========================================
 * 提供会员等级相关的校验逻辑：
 * - 合同数量限制
 * - AI 解析次数限制
 * - 功能权限校验
 * - 会员过期检查
 */

import prisma from '@/lib/prisma';
import { isBefore, addDays } from 'date-fns';

// ===========================================
// 套餐配置
// ===========================================

export interface PlanConfig {
  name: string;
  contractLimit: number;
  aiParseLimit: number;
  maxFileSize: number;
  features: string[];
  priceMonthly: number;
  priceYearly: number;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    name: '免费版',
    contractLimit: 20,
    aiParseLimit: 5,
    maxFileSize: 5,
    features: ['基础合同管理', '手动标签分类', '到期提醒(站内信)', '基础搜索'],
    priceMonthly: 0,
    priceYearly: 0,
  },
  pro: {
    name: '年度会员',
    contractLimit: -1,  // 无限
    aiParseLimit: -1,   // 无限
    maxFileSize: 20,
    features: ['无限合同数量', 'AI智能解析', '多格式上传', '智能分类归档',
               '到期提醒(站内信+邮件)', '合同导出', '数据看板', '全文检索', '高优客服'],
    priceMonthly: 0,
    priceYearly: 9900,  // 99元，单位分
  },
};

// ===========================================
// 会员状态检查
// ===========================================

export async function checkMemberStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, memberLevel: true, memberExpireAt: true },
  });

  if (!user) return { level: 'free' as const, isExpired: false, expireAt: null };

  const isExpired = user.memberExpireAt ? isBefore(user.memberExpireAt, new Date()) : false;

  if (isExpired && user.memberLevel !== 'free') {
    return { level: 'free' as const, isExpired: true, expireAt: user.memberExpireAt, originalLevel: user.memberLevel };
  }

  return { level: user.memberLevel as 'free' | 'pro', isExpired, expireAt: user.memberExpireAt };
}

// ===========================================
// 合同数量限制检查
// ===========================================

export async function checkContractLimit(userId: string): Promise<{
  allowed: boolean;
  code: 'ok' | 'expired' | 'over_limit' | 'feature_disabled';
  message: string;
  currentUsage?: number;
  limit?: number;
}> {
  const member = await checkMemberStatus(userId);
  const config = PLAN_CONFIGS[member.level] || PLAN_CONFIGS.free;

  if (config.contractLimit === -1) {
    return { allowed: true, code: 'ok', message: '无限合同', limit: -1 };
  }

  const count = await prisma.contract.count({ where: { userId } });

  if (count >= config.contractLimit) {
    return {
      allowed: false,
      code: 'over_limit',
      message: `免费版最多管理 ${config.contractLimit} 份合同，请升级年度会员`,
      currentUsage: count,
      limit: config.contractLimit,
    };
  }

  return { allowed: true, code: 'ok', message: `已使用 ${count}/${config.contractLimit}`, currentUsage: count, limit: config.contractLimit };
}

// ===========================================
// 功能权限检查
// ===========================================

export async function checkFeatureAccess(userId: string, feature: string): Promise<{
  allowed: boolean;
  code: string;
  message: string;
}> {
  const member = await checkMemberStatus(userId);
  const config = PLAN_CONFIGS[member.level] || PLAN_CONFIGS.free;

  if (member.level === 'free' && !config.features.some((f) => f.includes(feature))) {
    return { allowed: false, code: 'feature_disabled', message: `"${feature}" 需要升级年度会员` };
  }

  return { allowed: true, code: 'ok', message: '允许访问' };
}

// ===========================================
// 订单创建与会员升级
// ===========================================

export async function createUpgradeOrder(userId: string, planType: string) {
  const config = PLAN_CONFIGS.pro;
  const orderNo = `HT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      userId,
      orderNo,
      planType,
      amount: config.priceYearly / 100,
      currency: 'CNY',
      paymentStatus: 'pending',
      paymentMethod: 'wechat',
    },
  });

  return order;
}

export async function upgradeMemberAfterPayment(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return { success: false, error: '订单不存在' };

    const expireAt = addDays(new Date(), 365);

    await prisma.user.update({
      where: { id: order.userId },
      data: { memberLevel: 'pro', memberExpireAt: expireAt },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid', paidAt: new Date(), expireAt },
    });

    console.log(`[会员升级] 用户 ${order.userId} → 年度会员，到期 ${expireAt.toISOString()}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '升级失败' };
  }
}
