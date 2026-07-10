/**
 * 百度 OCR 工具库
 *
 * 封装百度 OCR 各场景 API 调用（通用文字、身份证、营业执照等）
 * 文档: https://ai.baidu.com/ai-doc/OCR/olqc085rg
 *
 * 环境变量:
 *   BAIDU_OCR_API_KEY=xxx       # 百度智能云 API Key
 *   BAIDU_OCR_SECRET_KEY=xxx    # 百度智能云 Secret Key
 *   BAIDU_OCR_APP_ID=123939966  # 百度智能云 AppID（可选）
 *   BAIDU_OCR_AES_KEY=xxx       # AES 加密密钥（可选）
 */

const API_KEY = process.env.BAIDU_OCR_API_KEY || process.env.QIANFAN_OCR_API_KEY || '';
const SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || process.env.QIANFAN_OCR_SECRET_KEY || '';

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取百度 OCR access_token（带缓存，有效期默认30天，提前1天刷新）
 */
export async function getBaiduAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!API_KEY || !SECRET_KEY) {
    throw new Error('百度 OCR 未配置，请在 .env 中设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY');
  }

  const res = await fetch(
    `${TOKEN_URL}?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`,
    { method: 'POST', cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`获取 token 失败: ${res.status}`);
  }

  const data: TokenResponse = await res.json();
  if (data.error) {
    throw new Error(`百度 OCR 认证失败: ${data.error_description || data.error}`);
  }

  // 缓存 token，提前1天过期
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 86400) * 1000,
  };

  return data.access_token;
}

/**
 * 清除缓存的 access_token
 */
export function clearTokenCache() {
  cachedToken = null;
}

/** 百度 OCR API 基础 URL */
const BAIDU_OCR_BASE = 'https://aip.baidubce.com/rest/2.0/ocr/v1';

/**
 * 通用请求：调用百度 OCR 指定接口
 */
export async function callBaiduOcr(
  endpoint: string,
  imageBase64: string,
  extraParams: Record<string, string> = {}
): Promise<any> {
  const accessToken = await getBaiduAccessToken();

  // 去掉 data:image/... 前缀
  const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const formData = new URLSearchParams();
  formData.append('image', imageData);

  // 附加参数
  Object.entries(extraParams).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const res = await fetch(`${BAIDU_OCR_BASE}/${endpoint}?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`百度 OCR 请求失败: ${res.status}`);
  }

  const data = await res.json();

  if (data.error_code) {
    throw new Error(`百度 OCR 错误 [${data.error_code}]: ${data.error_msg}`);
  }

  return data;
}

/**
 * 身份证 OCR — 识别身份证正面/反面
 *
 * idCardSide: 'front'（正面：姓名/性别/民族/出生/地址/身份证号）
 *             'back'（反面：签发机关/有效期）
 *
 * 返回结构化字段:
 *   front: { name, gender, nationality, birth, address, idNumber }
 *   back:  { issueAuthority, validDate }
 */
export async function recognizeIdCard(
  imageBase64: string,
  side: 'front' | 'back' = 'front'
): Promise<Record<string, string>> {
  const data = await callBaiduOcr('idcard', imageBase64, {
    id_card_side: side,
    detect_direction: 'true',
    detect_risk: 'false',
  });

  const result: Record<string, string> = {};

  if (data.words_result) {
    Object.entries(data.words_result).forEach(([key, val]: [string, any]) => {
      if (val && typeof val === 'object' && val.words) {
        result[key] = val.words;
      }
    });
  }

  return result;
}

/**
 * 营业执照 OCR
 *
 * 返回结构化字段:
 *   { creditCode, companyName, legalPerson, address, validityPeriod, businessScope, type, issueDate }
 */
export async function recognizeBusinessLicense(
  imageBase64: string
): Promise<Record<string, string>> {
  const data = await callBaiduOcr('business_license', imageBase64, {
    detect_direction: 'true',
    accuracy: 'high',
  });

  const result: Record<string, string> = {};

  if (data.words_result) {
    Object.entries(data.words_result).forEach(([key, val]: [string, any]) => {
      if (val && typeof val === 'object' && val.words) {
        result[key] = val.words;
      }
    });
  }

  return result;
}
