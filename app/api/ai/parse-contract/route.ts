import { NextRequest, NextResponse } from 'next/server';
import { parseContract } from '@/lib/ai-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, text, ocrText } = body;

    // 优先使用 text，若没有则用 ocrText
    const contractText = text || ocrText || '';

    if (!contractText) {
      return NextResponse.json({ code: 1, message: '缺少合同文本' }, { status: 400 });
    }

    // 如果同时存在 text 和 ocrText，将 ocrText 作为额外上下文注入
    let finalText = contractText;
    if (ocrText && text && ocrText !== text) {
      // text 是最终文本，ocrText 是原始 OCR 输出，text 已包含修正
      finalText = text;
    } else if (ocrText && !text) {
      finalText = ocrText;
    }

    const result = await parseContract(finalText, fileName);

    if (!result.success) {
      return NextResponse.json({
        code: 1,
        message: result.error || 'AI 解析失败',
      }, { status: 500 });
    }

    return NextResponse.json({
      code: 0,
      message: '解析成功',
      data: result.data,
    });
  } catch (error) {
    console.error('[AI解析API] 错误:', error);
    return NextResponse.json({
      code: 1,
      message: error instanceof Error ? error.message : '服务器错误',
    }, { status: 500 });
  }
}
