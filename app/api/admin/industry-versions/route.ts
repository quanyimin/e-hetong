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

// GET: 查询所有行业版本（含关联场景）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const versions = await prisma.industryVersion.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        scenes: {
          include: {
            scene: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const list = versions.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      icon: v.icon,
      description: v.description,
      status: v.isActive ? 'active' as const : 'inactive' as const,
      scenes: v.scenes.map((vs) => vs.scene.code),
      createdAt: v.createdAt.toISOString(),
    }));

    return NextResponse.json({ code: 0, data: list });
  } catch (error) {
    console.error('[行业版本列表API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取行业版本列表失败' }, { status: 500 });
  }
}

// POST: 创建行业版本（含场景关联）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { code, name, icon, description, scenes } = body as {
      code: string;
      name: string;
      icon?: string;
      description?: string;
      scenes: string[];
    };

    if (!code || !name) {
      return NextResponse.json({ code: 1, message: '缺少必填字段 code 或 name' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.industryVersion.create({
        data: {
          code,
          name,
          icon: icon || 'LayoutDashboard',
          description: description || null,
        },
      });

      if (scenes && scenes.length > 0) {
        // 将 scene code 解析为 DB ID
        const sceneRecords = await tx.industryScene.findMany({
          where: { code: { in: scenes } },
          select: { id: true, code: true },
        });
        const codeToId = new Map(sceneRecords.map((s) => [s.code, s.id]));
        await tx.industryVersionScene.createMany({
          data: scenes.map((sceneCode, index) => ({
            versionId: version.id,
            sceneId: codeToId.get(sceneCode) || '',
            isDefault: true,
            sortOrder: index,
          })),
        });
      }

      return version;
    });

    return NextResponse.json({ code: 0, message: '创建成功', data: { id: result.id } });
  } catch (error) {
    console.error('[创建行业版本API] 错误:', error);
    return NextResponse.json({ code: 1, message: '创建行业版本失败' }, { status: 500 });
  }
}
