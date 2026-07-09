import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hasMinRole } from '@/lib/permissions';
import { unauthorized, forbidden } from '@/lib/api-guard';

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

// PATCH: 更新成员角色
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ code: 1, message: '缺少 role 参数' }, { status: 400 });
    }

    const normalizedRole = role.toUpperCase();

    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return unauthorized();
    }

    // 查找目标成员记录
    const targetMember = await prisma.userTenantRole.findUnique({
      where: { id: memberId },
      include: { tenant: true },
    });

    if (!targetMember) {
      return NextResponse.json({ code: 1, message: '成员不存在' }, { status: 404 });
    }

    // 校验当前用户对该主体的 OWNER 权限
    const userRole = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId: targetMember.tenantId },
    });

    if (!userRole || !hasMinRole(userRole.role, 'OWNER')) {
      return forbidden('仅创建者可修改成员角色');
    }

    // 不允许修改 OWNER 的角色
    if (targetMember.role === 'OWNER') {
      return NextResponse.json({ code: 1, message: '无法修改创建者角色' }, { status: 403 });
    }

    // 不允许将角色改为 OWNER
    if (normalizedRole === 'OWNER') {
      return NextResponse.json({ code: 1, message: '无法将角色设为创建者' }, { status: 400 });
    }

    await prisma.userTenantRole.update({
      where: { id: memberId },
      data: { role: normalizedRole },
    });

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('[更新成员角色API] 错误:', error);
    return NextResponse.json({ code: 1, message: '更新失败' }, { status: 500 });
  }
}

// DELETE: 移除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;

    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return unauthorized();
    }

    // 查找目标成员记录
    const targetMember = await prisma.userTenantRole.findUnique({
      where: { id: memberId },
    });

    if (!targetMember) {
      return NextResponse.json({ code: 1, message: '成员不存在' }, { status: 404 });
    }

    // 不能移除 OWNER
    if (targetMember.role === 'OWNER') {
      return NextResponse.json({ code: 1, message: '无法移除创建者' }, { status: 403 });
    }

    // 校验当前用户对该主体的 ADMIN 及以上权限
    const userRole = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId: targetMember.tenantId },
    });

    if (!userRole || !hasMinRole(userRole.role, 'ADMIN')) {
      return forbidden('仅管理员和创建者可移除成员');
    }

    await prisma.userTenantRole.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ code: 0, message: '移除成功' });
  } catch (error) {
    console.error('[移除成员API] 错误:', error);
    return NextResponse.json({ code: 1, message: '移除失败' }, { status: 500 });
  }
}
