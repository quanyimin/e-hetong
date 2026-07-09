/**
 * ===========================================
 * 创建支付订单 API
 * ===========================================
 * POST /api/payment/create-order
 *
 * 请求体：{ "planType": "pro_yearly", "userId": "user_xxx" }
 * 响应：{ "code":0, "data":{ "orderNo":"xxx", "amount":99, "codeUrl":"weixin://..." } }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createUnifiedOrder } from '@/lib/payment';
import { addDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planType, userId } = body;

    if (!planType || !userId) {
      return NextResponse.json({ code: 1, message: '缺少必填参数' }, { status: 400 });
    }

    const validPlans: Record<string, { name: string; price: number; duration: number }> = {
      pro_yearly: { name: '年度会员', price: 99, duration: 365 },
    };

    const plan = validPlans[planType];
    if (!plan) {
      return NextResponse.json({ code: 1, message: '无效的套餐类型' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ code: 1, message: '用户不存在' }, { status: 404 });
    }

    if (user.memberLevel === 'pro' && user.memberExpireAt && user.memberExpireAt > new Date()) {
      return NextResponse.json({ code: 1, message: '您已是年度会员，无需重复购买' }, { status: 400 });
    }

    const orderNo = `HT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        userId,
        orderNo,
        planType,
        amount: plan.price,
        currency: 'CNY',
        paymentMethod: 'wechat',
        paymentStatus: 'pending',
        expireAt: addDays(new Date(), plan.duration),
      },
    });

    const result = await createUnifiedOrder({
      description: `多多合同管家 - ${plan.name}`,
      outTradeNo: orderNo,
      amount: plan.price,
      tradeType: 'NATIVE',
      attach: JSON.stringify({ orderId: order.id, userId }),
    });

    if (result.code !== 0 || !result.data) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'failed' } });
      return NextResponse.json({ code: 1, message: result.message || '支付下单失败' }, { status: 500 });
    }

    return NextResponse.json({
      code: 0,
      message: '下单成功',
      data: {
        orderId: order.id,
        orderNo,
        amount: plan.price,
        codeUrl: result.data.codeUrl,
        prepayId: result.data.prepayId,
      },
    });
  } catch (error) {
    console.error('[创建订单] 失败:', error);
    return NextResponse.json(
      { code: 1, message: '创建订单失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
