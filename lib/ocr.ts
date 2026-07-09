// lib/ocr.ts
// OCR 服务封装 — 使用 Tesseract.js 实现浏览器端文字识别
// v5.0 目标：拍照 → OCR → AI解析 → 极速入库(<10秒)

import { createWorker } from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

// 获取或创建Worker（单例，复用）
async function getWorker(lang = 'chi_sim+eng') {
  if (!worker) {
    worker = await createWorker(lang, 1, {
      logger: () => {
        // 可选的进度回调，由调用方传入
      },
    });
  }
  return worker;
}

// 终止 Worker（释放内存）
export async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

export interface OcrResult {
  text: string;
  confidence: number;
  blocks: any[];
}

// 核心 OCR 识别：从图片中提取文字
export async function extractTextFromImage(
  imageData: string | Buffer | Blob,
  options?: { lang?: string }
): Promise<OcrResult> {
  try {
    const w = await getWorker(options?.lang || 'chi_sim+eng');
    const result = await w.recognize(imageData);

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      blocks: result.data.blocks || [],
    };
  } catch (error) {
    console.error('[OCR] 识别失败:', error);
    return { text: '', confidence: 0, blocks: [] };
  }
}

// 快速 OCR：只返回文本，不返回详细块信息
export async function quickOCR(imageData: string): Promise<string> {
  try {
    const result = await extractTextFromImage(imageData);
    return result.text;
  } catch {
    return '';
  }
}
