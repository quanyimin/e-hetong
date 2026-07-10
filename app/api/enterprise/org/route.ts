import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

function getTenantId(request: NextRequest): string | null {
  return request.cookies.get('tenant_id')?.value || request.nextUrl.searchParams.get('tenantId') || null;
}

// GET /api/enterprise/org — 获取组织树
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ departments: [] });
    }
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error fetching org:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/enterprise/org — 创建部门
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少租户ID' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const body = await request.json();
    const { name, parentId, managerId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ code: 1, message: '部门名称不能为空' }, { status: 400 });
    }

    // 检查同级同名
    const existing = await prisma.department.findFirst({
      where: { tenantId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ code: 1, message: '同级部门下已存在同名部门' }, { status: 409 });
    }

    // 计算 sortOrder
    const lastDept = await prisma.department.findFirst({
      where: { tenantId, parentId: parentId || null },
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (lastDept?.sortOrder ?? -1) + 1;

    const department = await prisma.department.create({
      data: {
        tenantId,
        name: name.trim(),
        parentId: parentId || null,
        managerId: managerId || null,
        sortOrder,
      },
    });

    return NextResponse.json({ code: 0, message: '创建成功', data: department });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ code: 1, message: '创建部门失败' }, { status: 500 });
  }
}
