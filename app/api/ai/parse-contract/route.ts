import { NextRequest, NextResponse } from 'next/server';
import { parseContract } from '@/lib/ai-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, text } = body;

    if (!text) {
      return NextResponse.json({ code: 1, message: '缺少合同文本' }, { status: 400 });
    }

    const result = await parseContract(text, fileName);

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
