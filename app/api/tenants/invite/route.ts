import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createInvite } from '@/lib/invite-store';
import { unauthorized, forbidden } from '@/lib/api-guard';
import { hasMinRole } from '@/lib/permissions';

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

// POST: 生成邀请码/链接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, role } = body;

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少 tenantId 参数' }, { status: 400 });
    }

    const normalizedRole = (role || 'STAFF').toUpperCase();

    // 仅允许 ADMIN 和 OWNER 角色可被邀请
    const allowedRoles = ['STAFF', 'FINANCE', 'ADMIN', 'VIEWER', 'READONLY'];
    if (!allowedRoles.includes(normalizedRole)) {
      return NextResponse.json({ code: 1, message: '无效的角色类型' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return unauthorized();
    }

    // 校验当前用户对该主体有 ADMIN 及以上权限
    const userRole = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });

    if (!userRole || !hasMinRole(userRole.role, 'ADMIN')) {
      return forbidden('仅管理员和创建者可生成邀请链接');
    }

    // 校验租户存在
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ code: 1, message: '主体不存在' }, { status: 404 });
    }

    const invite = createInvite(tenantId, normalizedRole, currentUser.id);

    return NextResponse.json({
      success: true,
      data: {
        inviteCode: invite.code,
        inviteLink: `${request.nextUrl.origin}/join?code=${invite.code}`,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[生成邀请码API] 错误:', error);
    return NextResponse.json({ success: false, message: '生成邀请码失败' }, { status: 500 });
  }
}
