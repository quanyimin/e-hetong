import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET: 获取当前租户的行业版本及启用场景（布局使用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ code: 1, message: '缺少 tenantId' }, { status: 400 });
    }

    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const membership = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, tenantId },
    });
    if (!membership) return forbidden('您无权访问该主体');

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        industryVersionId: true,
        planId: true,
      },
    });

    if (!tenant || !tenant.industryVersionId) {
      return NextResponse.json({ code: 1, message: '租户未配置行业版本' }, { status: 404 });
    }

    // 获取行业版本信息
    const version = await prisma.industryVersion.findUnique({
      where: { id: tenant.industryVersionId },
      select: { id: true, code: true, name: true, icon: true },
    });

    if (!version) {
      return NextResponse.json({ code: 1, message: '行业版本不存在' }, { status: 404 });
    }

    // 获取版本默认场景
    const versionScenes = await prisma.industryVersionScene.findMany({
      where: { versionId: version.id, isDefault: true },
      include: {
        scene: {
          select: { id: true, code: true, name: true, icon: true, route: true, sortOrder: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 获取租户自定义启用场景覆盖
    const tenantScenes = await prisma.tenantEnabledScene.findMany({
      where: { tenantId, enabled: true },
      select: { sceneId: true },
    });

    const enabledSceneIds = tenantScenes.map((ts) => ts.sceneId);
    const defaultSceneIds = versionScenes.map((vs) => vs.scene.id);

    // 合并场景：默认场景 + 租户额外启用的场景，去重
    const allSceneIds = Array.from(new Set([...defaultSceneIds, ...enabledSceneIds]));

    const scenes = await prisma.industryScene.findMany({
      where: { id: { in: allSceneIds } },
      select: { id: true, code: true, name: true, icon: true, route: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 获取套餐信息
    let plan = null;
    if (tenant.planId) {
      const planRecord = await prisma.subscriptionPlan.findUnique({
        where: { id: tenant.planId },
        select: { id: true, code: true, name: true, level: true, price: true },
      });
      if (planRecord) plan = planRecord;
    }

    return NextResponse.json({
      code: 0,
      data: {
        version,
        scenes,
        plan,
      },
    });
  } catch (error) {
    console.error('[租户场景API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取租户场景失败' }, { status: 500 });
  }
}
