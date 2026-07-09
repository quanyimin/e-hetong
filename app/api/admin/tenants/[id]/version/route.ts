import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

// PATCH: 更新租户的行业版本（同时重建启用场景）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员身份
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();

    const isAdmin = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!isAdmin) {
      return NextResponse.json({ code: 1, message: '需要管理员权限' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { industryVersionId } = body as { industryVersionId: string };

    if (!industryVersionId) {
      return NextResponse.json({ code: 1, message: '缺少 industryVersionId' }, { status: 400 });
    }

    // 验证版本存在
    const version = await prisma.industryVersion.findUnique({ where: { id: industryVersionId } });
    if (!version) {
      return NextResponse.json({ code: 1, message: '行业版本不存在' }, { status: 404 });
    }

    // 验证租户存在
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ code: 1, message: '租户不存在' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 更新租户的行业版本
      await tx.tenant.update({
        where: { id },
        data: { industryVersionId },
      });

      // 获取新版默认场景
      const versionScenes = await tx.industryVersionScene.findMany({
        where: { versionId: industryVersionId, isDefault: true },
      });

      // 删除旧租户启用场景
      await tx.tenantEnabledScene.deleteMany({ where: { tenantId: id } });

      // 创建新版默认启用场景
      if (versionScenes.length > 0) {
        await tx.tenantEnabledScene.createMany({
          data: versionScenes.map((vs) => ({
            tenantId: id,
            sceneId: vs.sceneId,
            enabled: true,
          })),
        });
      }
    });

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('[更新租户版本API] 错误:', error);
    return NextResponse.json({ code: 1, message: '更新租户版本失败' }, { status: 500 });
  }
}
