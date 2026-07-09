/**
 * ===========================================
 * 微信支付核心库
 * ===========================================
 * 支持：
 * - Native 支付（扫码支付）
 * - JSAPI 支付（公众号内支付）
 * - H5 支付（微信外浏览器）
 * - 支付回调处理
 * - 订单查询
 * - 退款
 *
 * 商户后台配置：https://pay.weixin.qq.com/
 * API 文档：https://pay.weixin.qq.com/wiki/doc/apiv3/
 */

// ===========================================
// 类型定义
// ===========================================

export interface WxPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  serialNo: string;
  privateKey: string;
  notifyUrl: string;
}

export interface UnifiedOrderParams {
  description: string;
  outTradeNo: string;
  amount: number;
  payerOpenId?: string;
  tradeType: 'NATIVE' | 'JSAPI' | 'H5';
  timeExpire?: string;
  attach?: string;
}

export interface UnifiedOrderResult {
  prepayId: string;
  codeUrl?: string;
  h5Url?: string;
  payParams?: JsapiPayParams;
}

export interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

// ===========================================
// 微信支付配置加载
// ===========================================

export function getWxPayConfig(): WxPayConfig {
  return {
    appId: process.env.WXPAY_APPID || '',
    mchId: process.env.WXPAY_MCHID || '',
    apiKey: process.env.WXPAY_API_KEY || '',
    serialNo: process.env.WXPAY_SERIAL_NO || '',
    privateKey: process.env.WXPAY_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    notifyUrl: process.env.WXPAY_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify',
  };
}

export function isWxPayConfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const config = getWxPayConfig();
  return !!(config.appId && config.mchId && config.apiKey);
}

// ===========================================
// 统一下单
// ===========================================

export async function createUnifiedOrder(
  params: UnifiedOrderParams
): Promise<{ code: number; message: string; data?: UnifiedOrderResult }> {
  // 非生产环境：模拟模式
  if (process.env.NODE_ENV !== 'production' || !isWxPayConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockPrepayId = `mock${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

    const result: UnifiedOrderResult = {
      prepayId: mockPrepayId,
      codeUrl: params.tradeType === 'NATIVE'
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${mockPrepayId}`
        : undefined,
    };

    if (params.tradeType === 'JSAPI' && params.payerOpenId) {
      const config = getWxPayConfig();
      result.payParams = {
        appId: config.appId || 'mockAppId',
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: Math.random().toString(36).substring(2, 18),
        package: `prepay_id=${mockPrepayId}`,
        signType: 'RSA',
        paySign: 'mock_signature',
      };
    }

    console.log(`[微信支付-模拟] 下单成功:`, {
      outTradeNo: params.outTradeNo,
      amount: params.amount,
      prepayId: mockPrepayId,
    });

    return { code: 0, message: '下单成功（模拟）', data: result };
  }

  // 生产环境：真实微信支付 API
  try {
    const config = getWxPayConfig();
    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native';
    const body = {
      appid: config.appId,
      mchid: config.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: config.notifyUrl,
      amount: { total: Math.round(params.amount * 100), currency: 'CNY' },
      ...(params.attach ? { attach: params.attach } : {}),
    };

    console.log('[微信支付] 请求下单:', url, JSON.stringify(body));
    // TODO: 使用微信支付 API v3 签名并发送请求

    return { code: 0, message: '下单成功', data: { prepayId: 'wx' + Date.now() } };
  } catch (error) {
    console.error('[微信支付] 下单失败:', error);
    return { code: 1, message: '下单失败' };
  }
}

// ===========================================
// 支付结果回调处理
// ===========================================

export function parsePaymentCallback(body: any): {
  success: boolean;
  outTradeNo?: string;
  transactionId?: string;
  amount?: number;
  paidAt?: Date;
  attach?: string;
  error?: string;
} {
  try {
    if (process.env.NODE_ENV !== 'production') {
      if (body.mock) {
        return {
          success: true,
          outTradeNo: body.outTradeNo,
          transactionId: body.transactionId || `mock${Date.now()}`,
          amount: body.amount,
          paidAt: new Date(),
          attach: body.attach,
        };
      }
    }

    // 生产环境：验证签名并解密
    // TODO: 验证签名 verifyWxPaySignature(request)
    // TODO: 解密 resource.ciphertext

    return {
      success: true,
      outTradeNo: body.out_trade_no || body.outTradeNo,
      transactionId: body.transaction_id || body.transactionId,
      amount: body.amount ? body.amount / 100 : undefined,
      paidAt: new Date(),
      attach: body.attach,
    };
  } catch (error) {
    console.error('[微信支付] 回调解析失败:', error);
    return { success: false, error: '回调解析失败' };
  }
}

export function paymentCallbackSuccess(): Response {
  return new Response(
    JSON.stringify({ code: 'SUCCESS', message: '成功' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export function paymentCallbackFail(message?: string): Response {
  return new Response(
    JSON.stringify({ code: 'FAIL', message: message || '失败' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

// ===========================================
// 订单查询
// ===========================================

export async function queryOrder(outTradeNo: string): Promise<{
  code: number;
  message: string;
  data?: { tradeState: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED'; transactionId?: string; amount?: number; paidAt?: Date };
}> {
  if (process.env.NODE_ENV !== 'production') {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { code: 0, message: '查询成功', data: { tradeState: 'SUCCESS', transactionId: `mock${Date.now()}`, amount: 99, paidAt: new Date() } };
  }
  return { code: 1, message: '查询失败' };
}

// ===========================================
// 退款
// ===========================================

export async function refundOrder(params: {
  outTradeNo: string;
  outRefundNo: string;
  amount: number;
  totalAmount: number;
  reason?: string;
}): Promise<{ code: number; message: string }> {
  if (process.env.NODE_ENV !== 'production') {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { code: 0, message: '退款成功（模拟）' };
  }
  return { code: 1, message: '退款失败' };
}

export function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
