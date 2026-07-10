/**
 * 百度营业执照 OCR API 路由
 *
 * POST /api/ocr/business-license
 * Body: { image: base64 }
 *
 * 返回结构化字段:
 *   { creditCode, companyName, legalPerson, address, validityPeriod, businessScope, type, issueDate }
 */

import { NextRequest, NextResponse } from 'next/server';
import { recognizeBusinessLicense } from '@/lib/baidu-ocr';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '缺少 image 参数' }, { status: 400 });
    }

    const fields = await recognizeBusinessLicense(image);

    return NextResponse.json({
      success: true,
      fields,
    });
  } catch (error) {
    console.error('[营业执照OCR] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '营业执照识别失败',
      },
      { status: 500 }
    );
  }
}
