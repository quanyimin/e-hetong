/**
 * 千帆 Qianfan OCR API 路由
 *
 * 调用百度千帆 OCR API 识别图片文字
 * 文档: https://cloud.baidu.com/doc/OCR/s/dk3iqnq51
 *
 * .env 配置:
 *   QIANFAN_OCR_API_KEY=xxx    # 百度智能云 API Key
 *   QIANFAN_OCR_SECRET_KEY=xxx  # 百度智能云 Secret Key
 */

import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.QIANFAN_OCR_API_KEY || '';
const SECRET_KEY = process.env.QIANFAN_OCR_SECRET_KEY || '';

// 百度 OCR 接口地址
const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate';

interface QianfanOcrResponse {
  words_result: { words: string; probability: { average: number } }[];
  words_result_num: number;
  log_id: number;
  error_code?: number;
  error_msg?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

/**
 * 获取百度 OCR access_token
 */
async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${TOKEN_URL}?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`,
    { method: 'POST', cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`获取 token 失败: ${res.status}`);
  }

  const data: TokenResponse = await res.json();
  if (data.error) {
    throw new Error(`千帆认证失败: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * 调用百度高精度 OCR
 */
async function callAccurateOcr(
  imageBase64: string,
  accessToken: string
): Promise<QianfanOcrResponse> {
  // 百度 OCR 要求 URL-safe base64，去掉 data:image/... 前缀
  const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const formData = new URLSearchParams();
  formData.append('image', imageData);
  // 参数：检测方向 + 概率 + 段落输出
  formData.append('detect_direction', 'true');
  formData.append('probability', 'true');
  formData.append('paragraph', 'true');

  const res = await fetch(`${OCR_URL}?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`OCR 请求失败: ${res.status}`);
  }

  const data: QianfanOcrResponse = await res.json();

  if (data.error_code) {
    throw new Error(`千帆 OCR 错误 [${data.error_code}]: ${data.error_msg}`);
  }

  return data;
}

export async function GET() {
  const configured = !!(API_KEY && SECRET_KEY);
  return NextResponse.json({
    configured,
    message: configured
      ? '千帆 OCR 已配置'
      : '千帆 OCR 未配置，请在 .env 中设置 QIANFAN_OCR_API_KEY 和 QIANFAN_OCR_SECRET_KEY',
  });
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '缺少 image 参数' }, { status: 400 });
    }

    if (!API_KEY || !SECRET_KEY) {
      return NextResponse.json(
        { error: '千帆 OCR 未配置，请在 .env 中设置 QIANFAN_OCR_API_KEY 和 QIANFAN_OCR_SECRET_KEY' },
        { status: 503 }
      );
    }

    // 1. 获取 access_token
    const accessToken = await getAccessToken();

    // 2. 调用高精度 OCR
    const ocrResult = await callAccurateOcr(image, accessToken);

    // 3. 格式化结果
    const wordsResult = ocrResult.words_result.map((w) => ({
      words: w.words,
      probability: w.probability?.average || 0,
    }));

    const fullText = wordsResult.map((w) => w.words).join('\n');
    const avgConfidence =
      wordsResult.length > 0
        ? wordsResult.reduce((sum, w) => sum + w.probability, 0) / wordsResult.length
        : 0;

    return NextResponse.json({
      text: fullText,
      confidence: avgConfidence,
      wordsResult,
      wordsCount: wordsResult.length,
    });
  } catch (error) {
    console.error('[千帆OCR API] 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR 识别失败' },
      { status: 500 }
    );
  }
}
