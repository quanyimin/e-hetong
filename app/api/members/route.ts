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

// GET: 获取主体下的所有成员
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少 tenantId 参数' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return unauthorized();
    }

    // 校验当前用户对该主体有访问权限
    const userRole = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });

    if (!userRole) {
      return forbidden('您无权访问该主体');
    }

    // 仅 OWNER 和 ADMIN 可查看成员列表
    if (!hasMinRole(userRole.role, 'ADMIN')) {
      return forbidden();
    }

    const members = await prisma.userTenantRole.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const list = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email || '',
      name: m.user.name || '',
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));

    return NextResponse.json({ code: 0, data: { list } });
  } catch (error) {
    console.error('[成员列表API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取成员列表失败' }, { status: 500 });
  }
}

// POST: 添加成员到主体（支持通过 email 或 userId 添加）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, email, userId, role } = body;

    if (!tenantId || !role) {
      return NextResponse.json({ code: 1, message: '缺少必填参数（tenantId, role）' }, { status: 400 });
    }

    if (!email && !userId) {
      return NextResponse.json({ code: 1, message: '请提供 email 或 userId' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return unauthorized();
    }

    // 校验当前用户对该主体的管理权限
    const userRole = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });

    if (!userRole || !hasMinRole(userRole.role, 'ADMIN')) {
      return forbidden('仅管理员和创建者可添加成员');
    }

    // 不允许添加 OWNER 角色
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'OWNER') {
      return NextResponse.json({ code: 1, message: '无法添加创建者角色' }, { status: 400 });
    }

    // 查找目标用户：优先使用 userId，否则按邮箱查找
    let targetUser;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
    } else {
      targetUser = await prisma.user.findUnique({ where: { email } });
    }

    if (!targetUser) {
      return NextResponse.json({ code: 1, message: userId ? '用户ID不存在' : '该邮箱未注册，请先注册' }, { status: 404 });
    }

    // 检查是否已是成员
    const existing = await prisma.userTenantRole.findFirst({
      where: { userId: targetUser.id, tenantId },
    });

    if (existing) {
      // 已存在则更新角色
      await prisma.userTenantRole.update({
        where: { id: existing.id },
        data: { role: normalizedRole },
      });
      return NextResponse.json({ code: 0, message: '成员角色已更新' });
    }

    await prisma.userTenantRole.create({
      data: {
        userId: targetUser.id,
        tenantId,
        role: normalizedRole,
      },
    });

    return NextResponse.json({ code: 0, message: '添加成功' });
  } catch (error) {
    console.error('[添加成员API] 错误:', error);
    return NextResponse.json({ code: 1, message: '添加失败' }, { status: 500 });
  }
}

// DELETE: 移除成员
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ code: 1, message: '缺少 memberId 参数' }, { status: 400 });
    }

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
