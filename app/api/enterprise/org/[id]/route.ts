import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('tenant_id')?.value || request.nextUrl.searchParams.get('tenantId') || null;
}

// GET /api/enterprise/org/[id] — 获取部门详情（含成员）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少租户ID' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const department = await prisma.department.findUnique({
      where: { id: params.id },
    });
    if (!department || department.tenantId !== tenantId) {
      return NextResponse.json({ code: 1, message: '部门不存在' }, { status: 404 });
    }

    // 查询该租户下的成员（UserTenantRole）
    const members = await prisma.userTenantRole.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    return NextResponse.json({
      code: 0,
      data: {
        department,
        members: members.map(m => ({
          id: m.user.id,
          name: m.user.name || '未知用户',
          email: m.user.email,
          phone: m.user.phone,
          role: m.role,
          isManager: m.user.id === department.managerId,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    return NextResponse.json({ code: 1, message: '获取部门详情失败' }, { status: 500 });
  }
}

// PUT /api/enterprise/org/[id] — 编辑部门
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少租户ID' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const department = await prisma.department.findUnique({
      where: { id: params.id },
    });
    if (!department || department.tenantId !== tenantId) {
      return NextResponse.json({ code: 1, message: '部门不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { name, parentId, managerId } = body;

    const updateData: any = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ code: 1, message: '部门名称不能为空' }, { status: 400 });
      }
      // 检查同名冲突（排除自身）
      const existing = await prisma.department.findFirst({
        where: { tenantId, name: name.trim(), id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json({ code: 1, message: '同级部门下已存在同名部门' }, { status: 409 });
      }
      updateData.name = name.trim();
    }
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (managerId !== undefined) updateData.managerId = managerId || null;

    const updated = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ code: 0, message: '更新成功', data: updated });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ code: 1, message: '更新部门失败' }, { status: 500 });
  }
}

// DELETE /api/enterprise/org/[id] — 删除部门
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少租户ID' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const department = await prisma.department.findUnique({
      where: { id: params.id },
    });
    if (!department || department.tenantId !== tenantId) {
      return NextResponse.json({ code: 1, message: '部门不存在' }, { status: 404 });
    }

    // 检查是否有子部门
    const childrenCount = await prisma.department.count({
      where: { parentId: params.id },
    });
    if (childrenCount > 0) {
      return NextResponse.json({ code: 1, message: '该部门下存在子部门，请先删除子部门' }, { status: 400 });
    }

    await prisma.department.delete({ where: { id: params.id } });

    return NextResponse.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ code: 1, message: '删除部门失败' }, { status: 500 });
  }
}
