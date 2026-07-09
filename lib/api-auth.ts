/**
 * API 鉴权与数据隔离工具
 *
 * 所有业务 API 必须通过 getCurrentUser + verifyTenantAccess
 * 确保用户身份可验证、租户数据有权限访问，杜绝越权。
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ============================================================
// 响应辅助
// ============================================================
export function unauthorized() {
  return NextResponse.json({ code: 1, message: '未登录或身份已过期' }, { status: 401 });
}

export function forbidden(msg?: string) {
  return NextResponse.json({ code: 1, message: msg || '权限不足' }, { status: 403 });
}

// ============================================================
// 从 cookie 解析当前用户（同步，不查库）
// ============================================================
export function getCurrentUser(request: NextRequest): { id: string; role: string } | null {
  try {
    const cookie = request.cookies.get('ehetong_auth')?.value;
    if (!cookie) return null;
    return JSON.parse(cookie);
  } catch {
    return null;
  }
}

// ============================================================
// 校验当前用户对指定 tenantId 的访问权限
//   返回 userTenantRole 记录（含 role），供后续精细鉴权
//   如无权限则直接返回 403 Response（需 return 终止）
// ============================================================
export async function verifyTenantAccess(
  request: NextRequest,
  tenantId: string,
): Promise<{ userId: string; role: string } | NextResponse> {
  const currentUser = getCurrentUser(request);
  if (!currentUser) {
    return unauthorized();
  }

  const membership = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, tenantId },
  });

  if (!membership) {
    return forbidden('您无权访问该主体');
  }

  return { userId: currentUser.id, role: membership.role };
}

// ============================================================
// 简便版：直接获取 userId（已校验有 tenant 权限），否则 return
// 用法：const user = await requireUser(request, tenantId); if (user instanceof Response) return user;
// ============================================================
export async function requireUser(
  request: NextRequest,
  tenantId: string,
): Promise<{ userId: string; role: string }> {
  const result = await verifyTenantAccess(request, tenantId);
  if (result instanceof NextResponse) {
    throw new Error('UNAUTHORIZED');
  }
  return result;
}
