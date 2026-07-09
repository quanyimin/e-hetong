import { NextRequest, NextResponse } from 'next/server';
import { createTenant, getUserTenantAccess } from '@/lib/data-isolation';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, type, sceneType, industry, creditCode, industryVersionId, planId } = await request.json();

    if (!userId || !name) {
      return NextResponse.json({ success: false, error: '缺少必填参数' });
    }

    const result = await createTenant(userId, {
      name,
      type: type as any || 'PERSONAL',
      industry,
      sceneType: sceneType || 'GENERAL',
      creditCode,
      industryVersionId,
      planId,
    });

    const tenantAccess = await getUserTenantAccess(userId);

    return NextResponse.json({
      success: true,
      tenant: result,
      tenantAccess,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : '创建失败' });
  }
}