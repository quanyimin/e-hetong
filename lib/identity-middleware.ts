/**
 * 多身份数据隔离中间件
 *
 * 职责：
 * 1. 从 API 请求中提取当前身份的 identityType 和 orgId
 * 2. 校验该 orgId 是否属于当前登录用户
 * 3. 越权访问直接返回 403，不返回任何业务数据
 * 4. 提供构建数据库查询隔离条件的工具函数
 *
 * 角色：
 * - 个人身份（identityType=PERSONAL, orgId=用户个人标识）
 * - 企业身份（identityType=ENTERPRISE, orgId=企业的 tenantId）
 *
 * 典型用法（API Route）：
 *
 *   import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';
 *
 *   export async function GET(request: NextRequest) {
 *     const { identity, error } = await requireOrgAccess(request);
 *     if (error) return error;
 *
 *     const data = await prisma.contract.findMany({
 *       where: { ...buildFilter(identity), ...otherFilters },
 *     });
 *     return NextResponse.json({ data });
 *   }
 */

import { NextResponse } from 'next/server';
import { prisma } from './prisma';

// ─── 类型定义 ────────────────────────────────────────────────

export type IdentityType = 'PERSONAL' | 'ENTERPRISE';

export interface IdentityContext {
  /** 身份类型：PERSONAL（个人）| ENTERPRISE（企业） */
  identityType: IdentityType;
  /** 隔离标识：企业=tenantId，个人=userId */
  orgId: string;
  /** 当前用户ID */
  userId: string;
}

// ─── 核心函数 ────────────────────────────────────────────────

/**
 * 从 API 请求中提取身份上下文并校验访问权限
 *
 * 调用方式：在所有业务 API Route 入口处调用
 *   const { identity, error } = await requireOrgAccess(request);
 *   if (error) return error;
 *
 * 数据来源（优先级）：
 *   1. 请求头：x-identity-type / x-org-id / x-user-id（前端 fetch 时自动注入）
 *   2. Cookie：ehetong_identityType / ehetong_orgId / ehetong_userId
 *
 * 校验内容：
 *   - 用户是否存在（401）
 *   - orgId 是否属于当前用户（403）
 *   - 越权访问返回 403 ORG_FORBIDDEN
 */
export async function requireOrgAccess(
  request: Request
): Promise<{ identity: IdentityContext; error: null } | { identity: null; error: NextResponse }> {
  const headers = request.headers;

  // 1. 从请求头中读取身份信息
  let identityType = headers.get('x-identity-type') as IdentityType | null;
  let orgId = headers.get('x-org-id');
  let userId = headers.get('x-user-id');

  // 2. 从 Cookie 读取
  if (!userId || !orgId) {
    const cookie = headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookie.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    if (!userId) userId = cookies['ehetong_userId'];
    if (!orgId) orgId = cookies['ehetong_orgId'];
    if (!identityType) identityType = (cookies['ehetong_identityType'] as IdentityType) || null;
  }

  // 3. 缺少必要信息 → 401
  if (!userId || !orgId) {
    return {
      identity: null,
      error: NextResponse.json(
        { error: '未登录或无身份信息', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  // 4. 校验用户是否存在
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return {
      identity: null,
      error: NextResponse.json(
        { error: '用户不存在', code: 'USER_NOT_FOUND' },
        { status: 401 }
      ),
    };
  }

  // 5. 校验 orgId 归属 → 403 越权
  const hasAccess = await verifyOrgAccess(userId, orgId);
  if (!hasAccess) {
    return {
      identity: null,
      error: NextResponse.json(
        { error: '无权访问该组织的数据，禁止越权查询', code: 'ORG_FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  const identity: IdentityContext = {
    identityType: identityType || 'PERSONAL',
    orgId,
    userId,
  };

  return { identity, error: null };
}

// ─── 保留兼容别名 ────────────────────────────────────────────
/** @deprecated 使用 requireOrgAccess 替代 */
export const extractIdentity = requireOrgAccess;

/**
 * 校验用户是否有权访问指定组织
 * - PERSONAL: orgId 必须等于 userId（个人空间）
 * - ENTERPRISE: orgId 必须在用户的 tenantList 中
 */
async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false;

  // 查询用户与该 orgId 的关联
  const access = await prisma.userTenantRole.findFirst({
    where: { userId, tenantId: orgId },
  });
  if (access) return true;

  // 如果是个人身份，允许 orgId = userId
  if (userId === orgId) return true;

  return false;
}

/**
 * 构建数据库查询的隔离条件（供 API route 使用）
 * 所有业务查询必须附带此条件
 *
 * 使用示例：
 *   where: { ...buildFilter(identity), status: 'active' }
 */
export function buildFilter(identity: IdentityContext | null) {
  if (!identity) {
    // 无身份信息 → 返回一个永远为 false 的条件（防止泄露数据）
    return { id: '__NO_ACCESS__' };
  }

  const { identityType, orgId } = identity;

  // 个人身份：identityType=PERSONAL, tenantId=个人标识ID
  // 企业身份：identityType=ENTERPRISE, tenantId=企业ID
  return {
    identityType,
    tenantId: orgId,
  };
}

/** @deprecated 使用 buildFilter 替代 */
export const buildIsolationFilter = buildFilter;

/**
 * 验证请求中的身份是否与目标数据匹配（用于详情/修改/删除接口）
 * 返回 null 表示通过，返回 Response 表示拒绝
 */
export function requireSameOrg(
  identity: IdentityContext | null,
  dataIdentityType: string | null | undefined,
  dataTenantId: string | null | undefined
): NextResponse | null {
  if (!identity) {
    return NextResponse.json(
      { error: '未登录', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (!dataTenantId || !dataIdentityType) {
    return NextResponse.json(
      { error: '数据缺少身份信息，无法校验', code: 'DATA_MISSING_IDENTITY' },
      { status: 403 }
    );
  }

  if (dataIdentityType !== identity.identityType || dataTenantId !== identity.orgId) {
    return NextResponse.json(
      { error: '无权访问该数据', code: 'CROSS_ORG_FORBIDDEN' },
      { status: 403 }
    );
  }

  return null; // 校验通过
}
