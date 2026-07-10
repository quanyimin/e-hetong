import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/plugins/purchase — 购买插件
export async function POST(request: NextRequest) {
  try {
    const { tenantId, pluginId } = await request.json();

    if (!tenantId || !pluginId) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    // 检查插件是否存在
    const plugin = await prisma.pluginDefinition.findUnique({ where: { id: pluginId } });
    if (!plugin) {
      return NextResponse.json({ success: false, error: '插件不存在' }, { status: 404 });
    }

    // 检查是否已购买
    const existing = await prisma.purchasedPlugin.findUnique({
      where: { tenantId_pluginId: { tenantId, pluginId } },
    });
    if (existing && existing.status === 'active') {
      return NextResponse.json({ success: false, error: '该插件已购买' }, { status: 400 });
    }

    // 创建购买记录（简化版：直接激活；后续接入支付后改为 pending）
    const purchase = await prisma.purchasedPlugin.upsert({
      where: { tenantId_pluginId: { tenantId, pluginId } },
      update: { status: 'active', amount: plugin.price, purchasedAt: new Date(), expireAt: null },
      create: {
        tenantId,
        pluginId,
        sceneId: plugin.sceneId,
        status: 'active',
        amount: plugin.price,
        purchasedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error('[插件购买API] 失败:', error);
    return NextResponse.json({ success: false, error: '购买失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/plugins/purchase — 取消购买/退订
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const pluginId = searchParams.get('pluginId');

    if (!tenantId || !pluginId) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    await prisma.purchasedPlugin.update({
      where: { tenantId_pluginId: { tenantId, pluginId } },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[插件退订API] 失败:', error);
    return NextResponse.json({ success: false, error: '退订失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
