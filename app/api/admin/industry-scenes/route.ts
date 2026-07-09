import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';

// GET: 查询所有行业场景
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const currentUser = getCurrentUser(request);
    if (!currentUser) return unauthorized();
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { role: true },
    });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ code: 1, message: '需要管理员权限' }, { status: 403 });
    }

    // TODO: Phase 2 迁移到 IndustryScene 模型
    const scenes = [
      { id: '1', code: 'GENERAL', name: '通用', icon: 'FileText', description: '通用合同管理', route: '/dashboard', sortOrder: 1, isActive: true },
      { id: '2', code: 'LANDLORD', name: '房东收租', icon: 'Building', description: '房屋租赁与租金管理', route: '/dashboard/landlord', sortOrder: 2, isActive: true },
      { id: '3', code: 'CATERING', name: '餐饮管理', icon: 'UtensilsCrossed', description: '餐饮门店合同管理', route: '/dashboard/restaurant', sortOrder: 3, isActive: true },
      { id: '4', code: 'LEGAL', name: '律所法务', icon: 'Scale', description: '律师事务所合同管理', route: '/dashboard/legal', sortOrder: 4, isActive: false },
      { id: '5', code: 'TECH', name: '科技公司', icon: 'Monitor', description: '科技企业合同管理', route: '/dashboard/tech', sortOrder: 5, isActive: false },
    ];

    return NextResponse.json({ code: 0, data: scenes });
  } catch (error) {
    console.error('[行业场景列表API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取行业场景列表失败' }, { status: 500 });
  }
}
