import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/email/import-as-contract — 将邮件导入为合同
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, ocrText, from, date, attachments, reminderId } = body;

    if (!subject) {
      return NextResponse.json({ error: '缺少邮件主题' }, { status: 400 });
    }

    // 获取个人空间用于默认租户
    const personalSpace = await prisma.personalSpace.findUnique({
      where: { userId },
    });

    // 构建合同名称：邮件主题
    const contractName = subject.length > 200 ? subject.slice(0, 200) : subject;

    // 创建合同记录
    const contract = await prisma.contract.create({
      data: {
        userId,
        name: contractName,
        source: 'EMAIL_IMPORT',
        type: body.type || null,
        status: 'DRAFT',
        parseStatus: ocrText ? 'done' : 'pending',
        ocrText: ocrText || null,
        summary: `源自邮件导入 — 发件人: ${from || '未知'}`,
        searchText: [subject, from || '', ocrText ? ocrText.slice(0, 500) : '']
          .filter(Boolean)
          .join(' '),
        createdAt: new Date(),
      },
    });

    // 如果有 reminderId，将 reminder 关联到合同
    if (reminderId) {
      try {
        await prisma.reminder.update({
          where: { id: reminderId },
          data: { contractId: contract.id },
        });
      } catch (e) {
        // reminder 可能不存在，忽略关联错误
        console.warn('[导入合同] 关联 Reminder 失败:', e);
      }
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        name: contract.name,
        source: contract.source,
        status: contract.status,
        createdAt: contract.createdAt,
      },
    });
  } catch (error) {
    console.error('[导入合同] 失败:', error);
    return NextResponse.json({ error: '导入合同失败' }, { status: 500 });
  }
}
