import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/email/configure — 保存邮箱IMAP配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    // 邮箱配置存储在 PersonalSpace 的 customKeywords 字段中（JSON格式）
    const personalSpace = await prisma.personalSpace.findUnique({ where: { userId } });
    if (!personalSpace) return NextResponse.json({ error: '个人空间不存在' }, { status: 404 });

    const emailConfig = {
      email: body.email,
      imapServer: body.imapServer || 'imap.qq.com',
      imapPort: body.imapPort || 993,
      password: body.password, // 应用专用密码
      autoSync: body.autoSync ?? true,
      lastSyncAt: null,
      filterFolder: body.filterFolder || 'INBOX',
      filterSender: body.filterSender || '',
      filterKeyword: body.filterKeyword || '合同,协议,agreement,contract',
    };

    const existingConfig = JSON.parse(personalSpace.customKeywords || '{}');
    existingConfig.emailConfig = emailConfig;
    
    await prisma.personalSpace.update({
      where: { userId },
      data: { customKeywords: JSON.stringify(existingConfig) },
    });

    return NextResponse.json({ success: true, message: '邮箱配置已保存' });
  } catch (error) {
    console.error('Error saving email config:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// GET /api/email/configure — 获取邮箱配置
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const personalSpace = await prisma.personalSpace.findUnique({ where: { userId } });
    if (!personalSpace) return NextResponse.json({ error: '个人空间不存在' }, { status: 404 });

    const config = JSON.parse(personalSpace.customKeywords || '{}');
    const emailConfig = config.emailConfig || null;

    // 不返回密码
    if (emailConfig) {
      emailConfig.password = emailConfig.password ? '******' : null;
    }

    return NextResponse.json({ config: emailConfig });
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
