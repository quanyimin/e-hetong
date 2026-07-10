import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { contracts } = await request.json();
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return NextResponse.json({ success: false, error: '没有合同数据' }, { status: 400 });
    }
    const result = await prisma.contract.createMany({
      data: contracts.map((c: any) => {
        const startDateVal = c.startDate || c.signDate || c['签订日期'];
        const endDateVal = c.endDate || c.expireDate || c['到期日'];
        return {
          userId: c.userId || 'user_demo_001',
          tenantId: c.tenantId || 'default',
          name: c.name || c['合同名称'] || '',
          type: c.type || c['合同类型'] || 'OTHER',
          partyA: c.partyA || c['甲方'] || '',
          partyB: c.partyB || c['乙方'] || '',
          amount: parseFloat(c.amount || c['金额'] || 0),
          startDate: startDateVal ? new Date(startDateVal) : null,
          endDate: endDateVal ? new Date(endDateVal) : null,
          status: c.status || c['状态'] || 'active',
        };
      }),
    });
    return NextResponse.json({ success: true, imported: result.count });
  } catch (error) {
    return NextResponse.json({ success: false, error: '导入失败' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
