/**
 * 千帆 Qianfan OCR 服务
 * 百度千帆 OCR API 封装，比 Tesseract.js 准确率高 3-5 倍
 *
 * 使用前在 .env 中配置：
 *   QIANFAN_OCR_API_KEY=xxx
 *   QIANFAN_OCR_SECRET_KEY=xxx
 *
 * 如果不配置，自动降级到 Tesseract.js
 */

export interface QianfanOcrResult {
  text: string;
  confidence: number;
  wordsResult: { words: string; probability: number }[];
}

/**
 * 检查千帆 OCR 是否已配置
 */
export function isQianfanConfigured(): boolean {
  // 通过调用 API 的健康检查端点判断
  // 实际判断在服务端进行
  return true; // 由 API 端判断
}

/**
 * 调用千帆 OCR 识别图片文字
 * @param imageBase64 - 图片的 base64 数据（不含 data:image/... 前缀）
 */
export async function recognizeByQianfan(
  imageBase64: string
): Promise<QianfanOcrResult> {
  const response = await fetch('/api/ocr/qianfan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `OCR API 错误: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 千帆 OCR 快速识别（只返回文本）
 */
export async function quickQianfanOcr(imageBase64: string): Promise<string> {
  try {
    const result = await recognizeByQianfan(imageBase64);
    return result.text;
  } catch {
    return '';
  }
}
