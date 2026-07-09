import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

async function requireAdmin(request: NextRequest) {
  const currentUser = getCurrentUser(request);
  if (!currentUser) return { error: unauthorized() };
  const adminCheck = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, role: { in: ['OWNER', 'ADMIN'] } },
  });
  if (!adminCheck) return { error: forbidden('需要管理员权限') };
  return { error: null };
}

// GET: 获取单个行业版本（含关联场景）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;

    const version = await prisma.industryVersion.findUnique({
      where: { id },
      include: {
        scenes: {
          include: {
            scene: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ code: 1, message: '行业版本不存在' }, { status: 404 });
    }

    return NextResponse.json({
      code: 0,
      data: {
        id: version.id,
        code: version.code,
        name: version.name,
        icon: version.icon,
        description: version.description,
        status: version.isActive ? 'active' as const : 'inactive' as const,
        scenes: version.scenes.map((vs) => vs.scene.code),
        createdAt: version.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[行业版本详情API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取行业版本详情失败' }, { status: 500 });
  }
}

// PATCH: 更新行业版本（字段 + 场景关联替换）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;
    const body = await request.json();
    const { code, name, icon, description, status, scenes } = body as {
      code?: string;
      name?: string;
      icon?: string;
      description?: string | null;
      status?: 'active' | 'inactive';
      scenes?: string[];
    };

    const existing = await prisma.industryVersion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ code: 1, message: '行业版本不存在' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 更新版本字段
      const updateData: any = {};
      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (icon !== undefined) updateData.icon = icon;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.isActive = status === 'active';

      if (Object.keys(updateData).length > 0) {
        await tx.industryVersion.update({ where: { id }, data: updateData });
      }

      // 如果传入了 scenes（scene code 列表），替换全部场景关联
      if (scenes !== undefined) {
        await tx.industryVersionScene.deleteMany({ where: { versionId: id } });

        if (scenes.length > 0) {
          const sceneRecords = await tx.industryScene.findMany({
            where: { code: { in: scenes } },
            select: { id: true, code: true },
          });
          const codeToId = new Map(sceneRecords.map((s) => [s.code, s.id]));
          await tx.industryVersionScene.createMany({
            data: scenes.map((sceneCode, index) => ({
              versionId: id,
              sceneId: codeToId.get(sceneCode) || '',
              isDefault: true,
              sortOrder: index,
            })),
          });
        }
      }
    });

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('[更新行业版本API] 错误:', error);
    return NextResponse.json({ code: 1, message: '更新行业版本失败' }, { status: 500 });
  }
}

// DELETE: 删除行业版本（级联删除关联场景链接）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const { id } = params;

    const existing = await prisma.industryVersion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ code: 1, message: '行业版本不存在' }, { status: 404 });
    }

    // 检查是否有租户在使用该版本
    const tenantCount = await prisma.tenant.count({ where: { industryVersionId: id } });
    if (tenantCount > 0) {
      return NextResponse.json(
        { code: 1, message: `该版本已被 ${tenantCount} 个租户使用，无法删除` },
        { status: 400 }
      );
    }

    await prisma.industryVersion.delete({ where: { id } });

    return NextResponse.json({ code: 0, message: '删除成功' });
  } catch (error) {
    console.error('[删除行业版本API] 错误:', error);
    return NextResponse.json({ code: 1, message: '删除行业版本失败' }, { status: 500 });
  }
}
