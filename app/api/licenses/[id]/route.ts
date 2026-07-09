import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const license = await prisma.license.findUnique({ where: { id: params.id } });
    if (!license) return NextResponse.json({ error: '证照不存在' }, { status: 404 });
    return NextResponse.json({ license });
  } catch (error) {
    console.error('Error fetching license:', error);
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
    const fields = ['name', 'licenseNumber', 'issuingAuthority', 'type', 'status', 'attachmentUrl', 'notifyDays'];
    fields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });
    if (body.issueDate !== undefined) updateData.issueDate = new Date(body.issueDate);
    if (body.expireDate !== undefined) updateData.expireDate = new Date(body.expireDate);
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.metadata !== undefined) updateData.metadata = JSON.stringify(body.metadata);
    if (body.files !== undefined) updateData.files = JSON.stringify(body.files);

    // 自动更新状态
    if (body.expireDate && !body.status) {
      const expireDate = new Date(body.expireDate);
      const now = new Date();
      if (expireDate <= now) updateData.status = 'EXPIRED';
    }

    const license = await prisma.license.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json({ license });
  } catch (error) {
    console.error('Error updating license:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.license.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '证照已删除' });
  } catch (error) {
    console.error('Error deleting license:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
