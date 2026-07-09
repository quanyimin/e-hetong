import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: params.id } });
    if (!asset) return NextResponse.json({ error: '资产不存在' }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const fields = ['name', 'type', 'identifier', 'description', 'address', 'status'];
    fields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });
    if (body.area !== undefined) updateData.area = parseFloat(body.area);
    if (body.value !== undefined) updateData.value = parseFloat(body.value);
    if (body.nextMaintenanceAt !== undefined) updateData.nextMaintenanceAt = new Date(body.nextMaintenanceAt);
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.metadata !== undefined) updateData.metadata = JSON.stringify(body.metadata);

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.asset.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '资产已删除' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
