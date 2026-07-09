import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

// GET: 查询所有租户（含行业版本分配信息）
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const adminCheck = await prisma.userTenantRole.findFirst({
      where: { userId: currentUser.id, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!adminCheck) {
      return NextResponse.json({ code: 1, message: '需要管理员权限' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        industryVersionId: true,
      },
    });

    return NextResponse.json({ code: 0, data: tenants });
  } catch (error) {
    console.error('[租户列表API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取租户列表失败' }, { status: 500 });
  }
}
