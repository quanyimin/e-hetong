import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { createSignFlow, isEsignConfigured } from '@/lib/esign';

/**
 * POST /api/esign/create
 * 创建电子签章签署流程
 *
 * Request body:
 *   contractId: string - 合同 ID
 *   signers: Array<{ name: string; idCard?: string; phone: string; signType: string }>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, signers } = body;

    // 参数校验
    if (!contractId) {
      return NextResponse.json(
        { success: false, message: '缺少合同 ID' },
        { status: 400 }
      );
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json(
        { success: false, message: '缺少签署方信息' },
        { status: 400 }
      );
    }

    for (const signer of signers) {
      if (!signer.name || !signer.phone) {
        return NextResponse.json(
          { success: false, message: '签署方信息不完整，姓名和手机号为必填' },
          { status: 400 }
        );
      }
    }

    // 用户认证
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    // 查询合同是否存在
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: '合同不存在' },
        { status: 404 }
      );
    }

    // 权限校验
    if (contract.userId !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: '您无权对该合同发起签署' },
        { status: 403 }
      );
    }

    // 创建签署流程
    const esignParams = {
      contractId: contract.id,
      contractName: contract.name,
      signers: signers.map((s: any) => ({
        name: s.name,
        idCard: s.idCard || '',
        phone: s.phone,
        signType: (s.signType === 'SEQUENT' ? 'SEQUENT' : 'SINGLE') as 'SINGLE' | 'SEQUENT',
      })),
      fileUrl: contract.fileUrl || '',
    };

    const result = await createSignFlow(esignParams);

    // 将签署流程 ID 记录到合同（扩展字段，后续可通过 migration 添加正式字段）
    // 当前存储到 parsedData 中的 esign 字段
    try {
      const existingParsed = contract.parsedData ? JSON.parse(contract.parsedData) : {};
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          parsedData: JSON.stringify({
            ...existingParsed,
            esign: {
              signFlowId: result.signFlowId,
              status: result.status,
              createdAt: new Date().toISOString(),
            },
          }),
        },
      });
    } catch {
      // 解析或存储失败不影响主流程
    }

    return NextResponse.json({
      success: true,
      data: {
        signFlowId: result.signFlowId,
        signUrl: result.signUrl,
      },
    });
  } catch (error) {
    console.error('[电子签章创建] 错误:', error);
    return NextResponse.json(
      { success: false, message: '创建签署流程失败，请稍后重试' },
      { status: 500 }
    );
  }
}
