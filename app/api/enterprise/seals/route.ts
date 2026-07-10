import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// GET /api/enterprise/seals — 获取印章列表
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const seals = await prisma.seal.findMany({
      where: { ...buildFilter(identity) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ seals });
  } catch (error) {
    console.error('Error fetching seals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
