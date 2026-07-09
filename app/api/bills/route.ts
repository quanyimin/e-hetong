import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/bills - 获取账单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');
    const type = searchParams.get('type'); // INCOME | EXPENSE
    const status = searchParams.get('status'); // PENDING | PARTIAL | PAID | OVERDUE
    const tenantId = searchParams.get('tenantId');
    const partnerId = searchParams.get('partnerId');

    const where: Record<string, unknown> = {};
    if (contractId) where.contractId = contractId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (partnerId) where.partnerId = partnerId;
    if (tenantId) where.tenantId = tenantId;

    // 默认只查非过账
    if (!status) {
      where.status = { not: 'PAID' };
    }

    const bills = await prisma.bill.findMany({
      where: where as any,
      include: {
        contract: { select: { name: true, id: true } },
        partner: { select: { name: true, id: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // 计算统计
    const stats = {
      totalAmount: bills.reduce((s, b) => s + b.amount, 0),
      totalPaid: bills.filter(b => b.status === 'PAID').reduce((s, b) => s + b.amount, 0),
      totalPending: bills.filter(b => b.status === 'PENDING').reduce((s, b) => s + b.amount, 0),
      totalOverdue: bills.filter(b => b.status === 'OVERDUE').reduce((s, b) => s + b.amount, 0),
      count: bills.length,
    };

    return NextResponse.json({ bills, stats });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/bills - 创建账单（或自动从合同生成）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 从合同自动生成账单
    if (body.contractId && body.autoGenerate) {
      const contract = await prisma.contract.findUnique({
        where: { id: body.contractId },
        include: { bills: true },
      });

      if (!contract) {
        return NextResponse.json({ error: '合同不存在' }, { status: 404 });
      }

      if (!contract.amount) {
        return NextResponse.json({ error: '合同未设置金额，无法生成账单' }, { status: 400 });
      }

      // 检查是否已有账单
      if (contract.bills.length > 0) {
        return NextResponse.json({ error: '该合同已生成账单' }, { status: 409 });
      }

      const direction = contract.direction || 'INCOME';
      
      const bill = await prisma.bill.create({
        data: {
          contractId: contract.id,
          tenantId: contract.tenantId,
          partnerId: contract.partnerId,
          title: `${contract.name} - ${direction === 'INCOME' ? '应收' : '应付'}款`,
          amount: contract.amount,
          type: direction,
          category: contract.type || 'other',
          status: 'PENDING',
          dueDate: contract.endDate || undefined,
        },
        include: {
          contract: { select: { name: true } },
        },
      });

      return NextResponse.json({ bill, message: '账单已自动生成' });
    }

    // 手动创建账单
    const bill = await prisma.bill.create({
      data: {
        contractId: body.contractId,
        tenantId: body.tenantId,
        partnerId: body.partnerId,
        title: body.title,
        amount: body.amount,
        type: body.type,
        category: body.category,
        status: body.status || 'PENDING',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        remark: body.remark,
      },
      include: {
        contract: { select: { name: true } },
      },
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
