import { NextRequest, NextResponse } from 'next/server';
import { generateContract } from '@/lib/ai-contract-generator';
import { getContractTypeName } from '@/lib/industry-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industry, contractType, parameters, additionalRequirements } = body;

    // 校验必填字段
    if (!contractType) {
      return NextResponse.json({ success: false, error: '请选择合同类型' }, { status: 400 });
    }

    const contractTypeName = getContractTypeName(industry || null, contractType);

    const result = await generateContract({
      industry: industry || null,
      contractType,
      contractTypeName,
      parameters: parameters || {},
      additionalRequirements,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '合同生成失败',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[AI合同生成API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误',
    }, { status: 500 });
  }
}
