import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/enterprise/org
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.cookies.get('tenant_id')?.value || request.nextUrl.searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ departments: [] });
    }
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error fetching org:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
