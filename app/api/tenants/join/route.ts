import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getInvite, useInvite } from '@/lib/invite-store';
import { unauthorized } from '@/lib/api-guard';

// 从 cookie 中解析当前用户
function getCurrentUser(request: NextRequest): { id: string; role: string } | null {
  try {
    const cookie = request.cookies.get('ehetong_auth')?.value;
    if (!cookie) return null;
    return JSON.parse(cookie);
  } catch {
    return null;
  }
}

// POST: 通过邀请码加入主体
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json({ code: 1, message: '缺少 code 参数' }, { status: 400 });
    }

    // 确定目标用户ID
    let targetUserId = userId;

    // 如果未传 userId，则尝试从当前登录用户获取
    if (!targetUserId) {
      const currentUser = getCurrentUser(request);
      if (!currentUser) {
        return NextResponse.json(
          { code: 1, message: '缺少 userId 参数且未登录' },
          { status: 401 }
        );
      }
      targetUserId = currentUser.id;
    }

    // 查找邀请码
    const invite = getInvite(code);
    if (!invite) {
      return NextResponse.json({ code: 1, message: '邀请码不存在' }, { status: 404 });
    }

    // 检查是否已过期
    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ code: 1, message: '邀请码已过期' }, { status: 410 });
    }

    // 检查是否已被使用
    if (invite.used) {
      return NextResponse.json({ code: 1, message: '邀请码已被使用' }, { status: 410 });
    }

    // 验证目标用户存在
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ code: 1, message: '用户不存在' }, { status: 404 });
    }

    // 验证租户存在
    const tenant = await prisma.tenant.findUnique({ where: { id: invite.tenantId } });
    if (!tenant) {
      return NextResponse.json({ code: 1, message: '主体不存在' }, { status: 404 });
    }

    // 检查是否已是成员
    const existing = await prisma.userTenantRole.findFirst({
      where: { userId: targetUserId, tenantId: invite.tenantId },
    });

    if (existing) {
      return NextResponse.json({ code: 1, message: '您已是该主体的成员' }, { status: 409 });
    }

    // 标记邀请码已使用并创建成员记录
    const used = useInvite(code, targetUserId);
    if (!used) {
      return NextResponse.json({ code: 1, message: '邀请码无效或已过期' }, { status: 410 });
    }

    await prisma.userTenantRole.create({
      data: {
        userId: targetUserId,
        tenantId: invite.tenantId,
        role: invite.role,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantId: invite.tenantId,
        tenantName: tenant.name,
        role: invite.role,
      },
    });
  } catch (error) {
    console.error('[加入主体API] 错误:', error);
    return NextResponse.json({ success: false, message: '加入主体失败' }, { status: 500 });
  }
}
