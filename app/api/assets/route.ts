import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/assets - 资产列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const tenantId = searchParams.get('tenantId');

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (tenantId) where.tenantId = tenantId;

    const assets = await prisma.asset.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: assets.length,
      houses: assets.filter(a => a.type === 'HOUSE').length,
      equipment: assets.filter(a => a.type === 'EQUIPMENT').length,
      land: assets.filter(a => a.type === 'LAND').length,
      vehicle: assets.filter(a => a.type === 'VEHICLE').length,
      totalValue: assets.reduce((s, a) => s + (a.value || 0), 0),
    };

    return NextResponse.json({ assets, stats });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/assets - 创建资产
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const asset = await prisma.asset.create({
      data: {
        userId: body.userId,
        tenantId: body.tenantId,
        name: body.name,
        type: body.type,
        identifier: body.identifier,
        description: body.description,
        address: body.address,
        area: body.area ? parseFloat(body.area) : undefined,
        value: body.value ? parseFloat(body.value) : undefined,
        status: body.status || 'ACTIVE',
        nextMaintenanceAt: body.nextMaintenanceAt ? new Date(body.nextMaintenanceAt) : undefined,
        tags: body.tags ? JSON.stringify(body.tags) : undefined,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      },
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
