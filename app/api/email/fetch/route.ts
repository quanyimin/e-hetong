import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/email/fetch — 手动触发热邮箱抓取
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const personalSpace = await prisma.personalSpace.findUnique({ where: { userId } });
    if (!personalSpace) return NextResponse.json({ error: '个人空间不存在' }, { status: 404 });

    const config = JSON.parse(personalSpace.customKeywords || '{}');
    const emailConfig = config.emailConfig;
    if (!emailConfig) return NextResponse.json({ error: '请先配置邮箱' }, { status: 400 });

    // 模拟IMAP抓取结果（实际生产环境使用 node-imap 或 mailparser）
    const mockEmails = [
      {
        messageId: '<msg1@example.com>',
        subject: '房屋租赁合同 - 张三',
        from: 'zhangsan@example.com',
        date: new Date().toISOString(),
        attachments: [
          { filename: '房屋租赁合同-张三.pdf', contentType: 'application/pdf', size: 245000 },
          { filename: '押金收据.jpg', contentType: 'image/jpeg', size: 120000 },
        ],
      },
      {
        messageId: '<msg2@example.com>',
        subject: '食材配送协议 - 鲜味达供应链',
        from: 'xianweida@example.com',
        date: new Date(Date.now() - 86400000).toISOString(),
        attachments: [
          { filename: '配送协议2026.pdf', contentType: 'application/pdf', size: 312000 },
        ],
      },
      {
        messageId: '<msg3@example.com>',
        subject: '关于续签合同的补充条款',
        from: 'lawyer@lawfirm.com',
        date: new Date(Date.now() - 172800000).toISOString(),
        attachments: [
          { filename: '补充条款-最终版.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 89000 },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      emails: mockEmails,
      total: mockEmails.length,
      message: '模拟邮箱抓取成功（实际生产环境使用IMAP协议）',
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ error: '抓取失败' }, { status: 500 });
  }
}

// GET /api/email/fetch — 获取导入历史
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    // 从提醒记录中找邮件导入记录
    const imports = await prisma.reminder.findMany({
      where: {
        userId,
        remindType: 'EMAIL_IMPORT',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ imports, total: imports.length });
  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
