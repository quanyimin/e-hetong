import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOrgAccess, requireSameOrg } from '@/lib/identity-middleware';

// GET /api/bills/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: {
        contract: { select: { name: true, id: true } },
        partner: { select: { name: true, id: true } },
      },
    });
    if (!bill) {
      return NextResponse.json({ error: '账单不存在' }, { status: 404 });
    }

    const orgError = requireSameOrg(identity, bill?.identityType, bill?.tenantId);
    if (orgError) return orgError;

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/bills/[id] - 更新账单（包括付款登记）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const existing = await prisma.bill.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: '账单不存在' }, { status: 404 });
    const orgError = requireSameOrg(identity, existing?.identityType, existing?.tenantId);
    if (orgError) return orgError;

    const body = await request.json();
    
    // 计算新的已付金额
    const updateData: Record<string, unknown> = {};
    
    if (body.paidAmount !== undefined) {
      updateData.paidAmount = body.paidAmount;
    }
    
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'PAID') {
        updateData.paidAt = new Date();
      }
    }
    
    if (body.lateFee !== undefined) {
      updateData.lateFee = body.lateFee;
    }
    
    if (body.remark !== undefined) {
      updateData.remark = body.remark;
    }

    const bill = await prisma.bill.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contract: { select: { name: true } },
      },
    });

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/bills/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const existing = await prisma.bill.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: '账单不存在' }, { status: 404 });
    const orgError = requireSameOrg(identity, existing?.identityType, existing?.tenantId);
    if (orgError) return orgError;

    await prisma.bill.delete({ where: { id: params.id } });
    return NextResponse.json({ message: '账单已删除' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
