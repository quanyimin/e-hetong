import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 查询30天内到期的合同
    const contracts = await prisma.contract.findMany({
      where: {
        ...buildFilter(identity),
        endDate: { gte: now, lte: thirtyDaysLater },
        status: { not: 'ARCHIVED' },
      },
      select: { id: true, name: true, endDate: true, type: true },
    });

    // 查询30天内到期的证照
    const licenses = await prisma.license.findMany({
      where: {
        ...buildFilter(identity),
        expireDate: { gte: now, lte: thirtyDaysLater },
      },
      select: { id: true, name: true, expireDate: true, type: true },
    });

    // 查询30天内到期的账单（通过合同关联获取用户相关账单）
    const bills = await prisma.bill.findMany({
      where: {
        ...buildFilter(identity),
        dueDate: { gte: now, lte: thirtyDaysLater },
        status: 'PENDING',
      },
      select: { id: true, title: true, dueDate: true, amount: true },
    });

    const items = [
      ...contracts.map(c => ({
        id: `contract_${c.id}`,
        type: 'contract',
        title: c.name,
        date: c.endDate?.toISOString() || '',
        daysLeft: c.endDate ? Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        description: '合同到期',
        link: `/dashboard/contracts/${c.id}`,
      })),
      ...licenses.map(l => ({
        id: `license_${l.id}`,
        type: 'license',
        title: l.name,
        date: l.expireDate?.toISOString() || '',
        daysLeft: l.expireDate ? Math.ceil((l.expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        description: '证照到期',
        link: `/dashboard/licenses/${l.id}`,
      })),
      ...bills.map(b => ({
        id: `bill_${b.id}`,
        type: 'bill',
        title: b.title || '账单',
        date: b.dueDate?.toISOString() || '',
        daysLeft: b.dueDate ? Math.ceil((b.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        description: `¥${b.amount?.toLocaleString() || 0}`,
        link: `/dashboard/ledger`,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[Upcoming API] Error:', error);
    return NextResponse.json({ success: false, items: [] });
  }
}
