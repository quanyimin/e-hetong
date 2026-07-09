import { NextRequest, NextResponse } from 'next/server';
import { querySignStatus } from '@/lib/esign';

/**
 * GET /api/esign/status?signFlowId=xxx
 * 查询电子签章签署状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signFlowId = searchParams.get('signFlowId');

    if (!signFlowId) {
      return NextResponse.json(
        { success: false, message: '缺少签署流程 ID' },
        { status: 400 }
      );
    }

    const result = await querySignStatus(signFlowId);

    return NextResponse.json({
      success: true,
      data: {
        status: result.status,
        signedAt: result.signedAt || null,
      },
    });
  } catch (error) {
    console.error('[电子签章状态查询] 错误:', error);
    return NextResponse.json(
      { success: false, message: '查询签署状态失败' },
      { status: 500 }
    );
  }
}
