/**
 * 百度身份证 OCR API 路由
 *
 * POST /api/ocr/idcard
 * Body: { image: base64, side: 'front' | 'back' }
 *
 * 正面返回: { name, gender, nationality, birth, address, idNumber }
 * 反面返回: { issueAuthority, validDate }
 */

import { NextRequest, NextResponse } from 'next/server';
import { recognizeIdCard } from '@/lib/baidu-ocr';

export async function POST(request: NextRequest) {
  try {
    const { image, side = 'front' } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '缺少 image 参数' }, { status: 400 });
    }

    if (!['front', 'back'].includes(side)) {
      return NextResponse.json({ error: 'side 参数必须为 front 或 back' }, { status: 400 });
    }

    const fields = await recognizeIdCard(image, side as 'front' | 'back');

    return NextResponse.json({
      success: true,
      side,
      fields,
    });
  } catch (error) {
    console.error('[身份证OCR] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '身份证识别失败',
      },
      { status: 500 }
    );
  }
}
