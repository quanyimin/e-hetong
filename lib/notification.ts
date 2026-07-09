/**
 * ===========================================
 * 多渠道通知发送工具
 * ===========================================
 *
 * 支持通道：
 * 1. 站内信 (in_app) - 已实现
 * 2. 邮件 (email) - 已接框架
 * 3. 微信订阅消息 (wechat_subscribe) - 已接框架
 * 4. 微信模板消息 (wechat_template) - 预留兼容
 * 5. 短信 (sms) - 预留接口
 * 6. AI电话 (ai_call) - 预留接口
 */

import prisma from '@/lib/prisma';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'wechat_subscribe'
  | 'wechat_template'
  | 'sms'
  | 'ai_call';

export interface NotificationPayload {
  userId: string;
  contractId: string;
  title: string;
  message: string;
  remindAt: Date;
  remindType: 'expire' | 'review' | 'custom';
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  extra?: {
    phone?: string;
    aiScript?: string;
    templateId?: string;
    pagePath?: string;
  };
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

export async function sendReminderNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const channels = payload.channels || ['in_app', 'email'];
  const results: NotificationResult[] = [];

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          results.push(await sendInApp(payload));
          break;
        case 'email':
          results.push(await sendEmail(payload));
          break;
        case 'wechat_subscribe':
          results.push(await sendWechatSubscribe(payload));
          break;
        case 'wechat_template':
          results.push(await sendWechatTemplate(payload));
          break;
        case 'sms':
          results.push(await sendSms(payload));
          break;
        case 'ai_call':
          results.push(await sendAiCall(payload));
          break;
      }
    } catch (error) {
      console.error(`[通知] ${channel} 异常:`, error);
      results.push({ success: false, channel, error: error instanceof Error ? error.message : '异常' });
    }
  }
  return results;
}

// ===== 1. 站内信 =====
async function sendInApp(p: NotificationPayload): Promise<NotificationResult> {
  const existing = await prisma.reminder.findFirst({
    where: {
      contractId: p.contractId,
      userId: p.userId,
      remindType: p.remindType,
      remindAt: p.remindAt,
      sendStatus: { in: ['pending', 'sent'] },
    },
  });

  if (existing) return { success: true, channel: 'in_app' };

  await prisma.reminder.create({
    data: {
      contractId: p.contractId,
      userId: p.userId,
      remindType: p.remindType,
      title: p.title,
      message: p.message,
      remindAt: p.remindAt,
      sendStatus: 'pending',
    },
  });

  console.log(`[站内信] 已创建: ${p.title}`);
  return { success: true, channel: 'in_app' };
}

// ===== 2. 邮件 =====
async function sendEmail(p: NotificationPayload): Promise<NotificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: p.userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    return { success: false, channel: 'email', error: '未绑定邮箱' };
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[邮件] 至 ${user.email} | 主题: ${p.title}`);
    return { success: true, channel: 'email' };
  }

  // 生产环境接入 Resend
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: '易合同 <noreply@e-hetong.com>', to: user.email, subject: p.title, html: buildEmailHtml(p, user.name) });

  return { success: false, channel: 'email', error: '请配置 RESEND_API_KEY' };
}

// ===== 3. 微信订阅消息（推荐）=====
async function sendWechatSubscribe(p: NotificationPayload): Promise<NotificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: p.userId },
    select: { wechatOpenId: true },
  });

  if (!user?.wechatOpenId) {
    return { success: false, channel: 'wechat_subscribe', error: '未绑定微信' };
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[微信订阅] 至 ${user.wechatOpenId} | 标题: ${p.title}`);
    return { success: true, channel: 'wechat_subscribe' };
  }

  const appId = process.env.WX_APPID || '';
  const secret = process.env.WX_SECRET || '';
  const templateId = p.extra?.templateId || process.env.WX_SUBSCRIBE_TEMPLATE_ID || '';

  if (!appId || !secret || !templateId) {
    return { success: false, channel: 'wechat_subscribe', error: '请配置 WX_APPID/WX_SECRET/WX_SUBSCRIBE_TEMPLATE_ID' };
  }

  // 生产环境：获取 access_token 并发送订阅消息
  // const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`);
  // const { access_token } = await tokenRes.json();
  // await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend?access_token=${access_token}`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     touser: user.wechatOpenId,
  //     template_id: templateId,
  //     page: p.extra?.pagePath || `pages/contract/detail?id=${p.contractId}`,
  //     data: {
  //       thing1: { value: p.title.slice(0, 20) },
  //       thing2: { value: p.message.slice(0, 20) },
  //       date3: { value: p.remindAt.toLocaleDateString('zh-CN') },
  //     },
  //   }),
  // });

  return { success: false, channel: 'wechat_subscribe', error: '请接入 access_token 流程' };
}

// ===== 4. 微信模板消息（预留）=====
async function sendWechatTemplate(p: NotificationPayload): Promise<NotificationResult> {
  return { success: false, channel: 'wechat_template', error: '请使用微信订阅消息替代' };
}

// ===== 5. 短信（预留）=====
async function sendSms(p: NotificationPayload): Promise<NotificationResult> {
  let phone = p.extra?.phone;
  if (!phone) {
    const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { phone: true } });
    phone = user?.phone || undefined;
  }
  if (!phone) return { success: false, channel: 'sms', error: '未绑定手机号' };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[短信] 至 ${phone} | ${p.message.slice(0, 40)}`);
    return { success: true, channel: 'sms' };
  }

  // 阿里云短信示例：
  // const SMSClient = require('@alicloud/sms-sdk');
  // const client = new SMSClient({ accessKeyId: process.env.SMS_ACCESS_KEY, secretAccessKey: process.env.SMS_SECRET_KEY });
  // await client.sendSMS({ PhoneNumbers: phone, SignName: process.env.SMS_SIGN || '易合同', TemplateCode: process.env.SMS_TEMPLATE_REMINDER, TemplateParam: JSON.stringify({ title: p.title, date: p.remindAt.toLocaleDateString('zh-CN') }) });

  return { success: false, channel: 'sms', error: '请配置短信服务商' };
}

// ===== 6. AI 电话（预留）=====
async function sendAiCall(p: NotificationPayload): Promise<NotificationResult> {
  let phone = p.extra?.phone;
  if (!phone) {
    const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { phone: true } });
    phone = user?.phone || undefined;
  }
  if (!phone) return { success: false, channel: 'ai_call', error: '未绑定手机号' };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AI电话] 拨打 ${phone} | 话术: ${(p.extra?.aiScript || p.message).slice(0, 60)}`);
    return { success: true, channel: 'ai_call' };
  }

  // 阿里云语音通知示例：
  // await fetch('https://dyvmsapi.aliyuncs.com/', { method: 'POST', body: new URLSearchParams({ Action: 'SingleCallByTts', CalledNumber: phone, CalledShowNumber: process.env.AI_CALL_SHOW_NUMBER || '4000000000', TtsCode: process.env.AI_CALL_TEMPLATE_ID, TtsParam: JSON.stringify({ title: p.title }) }) });

  return { success: false, channel: 'ai_call', error: '请配置AI电话服务商' };
}

// ===== HTML 邮件模板 =====
function buildEmailHtml(p: NotificationPayload, userName: string | null): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://e-hetong.com';
  const contractUrl = `${appUrl}/dashboard/contracts/${p.contractId}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f6f9fc;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="padding:30px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
      <h1 style="margin:0;color:#fff;font-size:20px;">合同提醒通知</h1>
    </div>
    <div style="padding:30px 40px;">
      <p style="color:#555;font-size:14px;">${userName ? `尊敬的 <strong>${userName}</strong>，您好：` : '您好：'}</p>
      <div style="background:#f0f4ff;border-left:4px solid #6366f1;padding:16px 20px;margin:20px 0;border-radius:4px;">
        <p style="margin:0 0 8px;font-size:16px;color:#333;font-weight:600;">${p.title}</p>
        <p style="margin:0;font-size:14px;color:#666;white-space:pre-wrap;">${p.message}</p>
      </div>
      <p style="color:#888;font-size:13px;">提醒时间：${p.remindAt.toLocaleString('zh-CN')}</p>
      <div style="margin-top:30px;text-align:center;">
        <a href="${contractUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;">查看合同详情</a>
      </div>
    </div>
    <div style="padding:20px 40px;background:#f8f9fa;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
      此邮件由易合同系统自动发送<br><a href="${appUrl}" style="color:#6366f1;text-decoration:none;">${appUrl}</a>
    </div>
  </div>
</body></html>`;
}
