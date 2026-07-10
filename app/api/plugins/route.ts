import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/plugins — 列出所有插件（含当前租户购买状态）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId'); // 可选，传了会标记已购状态

    const plugins = await prisma.pluginDefinition.findMany({
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
      include: {
        scene: { select: { id: true, name: true, icon: true } },
      },
    });

    // 如果传了 tenantId，查询该租户已购插件
    let purchasedPluginIds: string[] = [];
    if (tenantId) {
      const purchases = await prisma.purchasedPlugin.findMany({
        where: { tenantId, status: 'active' },
        select: { pluginId: true, purchasedAt: true, expireAt: true, amount: true },
      });
      purchasedPluginIds = purchases.map(p => p.pluginId);
    }

    const result = plugins.map(p => ({
      ...p,
      purchased: purchasedPluginIds.includes(p.id),
      sceneName: p.scene?.name || null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[插件API] 查询失败:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
