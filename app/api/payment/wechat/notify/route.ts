/**
 * ===========================================
 * 微信支付回调处理
 * ===========================================
 * POST /api/payment/wechat/notify
 *
 * 微信支付成功后，微信服务器会回调此接口通知支付结果。
 * 需要在微信商户平台配置回调 URL：
 *   产品中心 → 开发配置 → 支付回调通知
 *   URL: https://your-domain.com/api/payment/wechat/notify
 *
 * 【安全说明】
 * 生产环境必须验证微信签名！
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parsePaymentCallback, paymentCallbackSuccess, paymentCallbackFail } from '@/lib/payment';
import { upgradeMemberAfterPayment } from '@/lib/member';

export async function POST(request: NextRequest) {
  try {
    console.log('[支付回调] 收到微信支付回调通知');

    const body = await request.json();
    const result = parsePaymentCallback(body);

    if (!result.success) {
      console.error('[支付回调] 解析失败:', result.error);
      return paymentCallbackFail(result.error || '回调解析失败');
    }

    const { outTradeNo } = result;

    if (!outTradeNo) {
      console.error('[支付回调] 缺少订单号');
      return paymentCallbackFail('缺少订单号');
    }

    console.log(`[支付回调] 订单 ${outTradeNo} 支付成功`);

    const order = await prisma.order.findUnique({ where: { orderNo: outTradeNo } });

    if (!order) {
      console.error(`[支付回调] 订单不存在: ${outTradeNo}`);
      return paymentCallbackFail('订单不存在');
    }

    if (order.paymentStatus === 'paid') {
      console.log(`[支付回调] 订单 ${outTradeNo} 已处理，跳过`);
      return paymentCallbackSuccess();
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'paid', paidAt: new Date() },
    });

    const upgradeResult = await upgradeMemberAfterPayment(order.id);

    if (!upgradeResult.success) {
      console.error(`[支付回调] 会员升级失败:`, upgradeResult.error);
    }

    console.log(`[支付回调] 处理完成: ${outTradeNo} → 会员升级${upgradeResult.success ? '成功' : '失败'}`);

    return paymentCallbackSuccess();
  } catch (error) {
    console.error('[支付回调] 处理异常:', error);
    return paymentCallbackFail('服务器内部错误');
  }
}

export async function GET() {
  return NextResponse.json({ code: 0, message: '微信支付回调接口正常', note: '仅接受 POST 请求' });
}
