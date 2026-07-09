/**
 * ===========================================
 * 合同到期提醒服务
 * ===========================================
 * 核心功能：
 * 1. 扫描即将到期的合同，生成提醒记录
 * 2. 支持提前 7天 / 3天 / 1天 三次提醒
 * 3. 发送多渠道通知（站内信/邮件/微信）
 * 4. 配套定时任务脚本见 scripts/reminder-cron.ts
 */

import prisma from '@/lib/prisma';
import { sendReminderNotification } from '@/lib/notification';
import { addDays, startOfDay, endOfDay, differenceInCalendarDays } from 'date-fns';

// ===========================================
// 提醒策略配置
// ===========================================

interface ReminderRule {
  daysBefore: number;
  label: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const REMINDER_RULES: ReminderRule[] = [
  { daysBefore: 7, label: '第一次提醒', priority: 'normal' },
  { daysBefore: 3, label: '第二次提醒', priority: 'high' },
  { daysBefore: 1, label: '最后一次提醒', priority: 'urgent' },
];

const FREE_USER_REMINDER_ENABLED = true;

// ===========================================
// 核心：检查即将到期的合同
// ===========================================

export async function checkExpiringContracts(): Promise<{
  total: number;
  created: number;
  failed: number;
  details: { contractName: string; daysBefore: number; status: string }[];
}> {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  到期提醒检查 - ${new Date().toLocaleString('zh-CN')}`);
  console.log(`═══════════════════════════════════════`);

  const today = startOfDay(new Date());
  const details: { contractName: string; daysBefore: number; status: string }[] = [];
  let created = 0;
  let failed = 0;

  // 1. 查询所有有效的合同
  const contracts = await prisma.contract.findMany({
    where: {
      endDate: {
        gte: today,
        lte: endOfDay(addDays(today, 7)),
      },
      parseStatus: { not: 'failed' as const },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, memberLevel: true, wechatOpenId: true },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  console.log(`  [扫描] 共找到 ${contracts.length} 份即将到期的合同`);

  for (const contract of contracts) {
    const daysUntilExpiry = differenceInCalendarDays(contract.endDate!, today);

    if (contract.user.memberLevel === 'free' && !FREE_USER_REMINDER_ENABLED) {
      console.log(`  [跳过-免费版] 合同 "${contract.name}"`);
      details.push({ contractName: contract.name, daysBefore: daysUntilExpiry, status: 'skipped_free' });
      continue;
    }

    for (const rule of REMINDER_RULES) {
      if (daysUntilExpiry !== rule.daysBefore) continue;

      try {
        // 检查是否已存在相同提醒
        const existingReminder = await prisma.reminder.findFirst({
          where: {
            contractId: contract.id,
            remindType: 'expire',
            remindAt: contract.endDate!,
            title: { contains: rule.label },
          },
        });

        if (existingReminder) {
          console.log(`  [已存在] 合同 "${contract.name}" - ${rule.label}`);
          details.push({ contractName: contract.name, daysBefore: rule.daysBefore, status: 'exists' });
          continue;
        }

        // 生成提醒
        const title = `【${rule.label}】合同即将到期 - ${contract.name}`;
        const message = [
          `合同名称：${contract.name}`,
          contract.partyA ? `甲方：${contract.partyA}` : '',
          contract.partyB ? `乙方：${contract.partyB}` : '',
          contract.amount ? `金额：¥${contract.amount.toLocaleString()}` : '',
          `到期日期：${contract.endDate!.toLocaleDateString('zh-CN')}`,
          `距到期还有 ${daysUntilExpiry} 天，请及时处理。`,
        ].filter(Boolean).join('\n');

        // 发送通知
        const results = await sendReminderNotification({
          userId: contract.userId,
          contractId: contract.id,
          title,
          message,
          remindAt: contract.endDate!,
          remindType: 'expire',
          channels: ['in_app', 'email', 'wechat_subscribe'],
          priority: rule.priority,
        });

        const allSent = results.every((r) => r.success);
        if (allSent) {
          await prisma.reminder.updateMany({
            where: {
              contractId: contract.id,
              remindType: 'expire',
              title: { contains: rule.label },
              sendStatus: 'pending',
            },
            data: { sendStatus: 'sent', sentAt: new Date() },
          });
        }

        created++;
        console.log(`  [提醒生成] 合同 "${contract.name}" - ${rule.label}（${rule.daysBefore}天前）${allSent ? '✅' : '⚠️'}`);
        details.push({ contractName: contract.name, daysBefore: rule.daysBefore, status: allSent ? 'created' : 'partial' });

        for (const result of results) {
          if (!result.success) {
            console.error(`    [${result.channel}] 失败: ${result.error}`);
            failed++;
          }
        }
      } catch (error) {
        console.error(`  [错误] 合同 "${contract.name}" 生成失败:`, error);
        failed++;
        details.push({ contractName: contract.name, daysBefore: rule.daysBefore, status: 'error' });
      }
    }
  }

  console.log(`═══════════════════════════════════════`);
  console.log(`  结果：成功 ${created} 条，失败 ${failed} 条`);
  console.log(`═══════════════════════════════════════\n`);

  return { total: contracts.length, created, failed, details };
}

// ===========================================
// 获取用户的提醒列表
// ===========================================

export async function getUserReminders(params: {
  userId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}) {
  const { userId, page = 1, pageSize = 20, status, type } = params;
  const where: any = { userId };

  if (status) where.sendStatus = status;
  if (type) where.remindType = type;

  const [total, reminders] = await Promise.all([
    prisma.reminder.count({ where }),
    prisma.reminder.findMany({
      where,
      include: { contract: { select: { id: true, name: true } } },
      orderBy: { remindAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { list: reminders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ===========================================
// 获取提醒统计
// ===========================================

export async function getReminderStats(userId: string) {
  const [pending, sent, failed, total] = await Promise.all([
    prisma.reminder.count({ where: { userId, sendStatus: 'pending' } }),
    prisma.reminder.count({ where: { userId, sendStatus: 'sent' } }),
    prisma.reminder.count({ where: { userId, sendStatus: 'failed' } }),
    prisma.reminder.count({ where: { userId } }),
  ]);
  return { pending, sent, failed, total };
}

// ===========================================
// 创建手动提醒
// ===========================================

export async function createManualReminder(params: {
  userId: string;
  tenantId?: string;
  contractId: string;
  remindAt: Date;
  remindType: 'expire' | 'review' | 'custom';
  title: string;
  message?: string;
}): Promise<{ success: boolean; error?: string; reminderId?: string }> {
  try {
    const reminder = await prisma.reminder.create({
      data: {
        contractId: params.contractId,
        userId: params.userId,
        tenantId: params.tenantId,
        remindAt: params.remindAt,
        remindType: params.remindType,
        title: params.title,
        message: params.message || params.title,
        sendStatus: 'pending',
      },
    });

    sendReminderNotification({
      userId: params.userId,
      contractId: params.contractId,
      title: params.title,
      message: params.message || params.title,
      remindAt: params.remindAt,
      remindType: params.remindType,
    }).catch((err) => console.error('[手动提醒] 通知发送失败:', err));

    return { success: true, reminderId: reminder.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '创建失败' };
  }
}
