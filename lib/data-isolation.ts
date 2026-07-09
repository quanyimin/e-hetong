import prisma from '@/lib/prisma';

export interface TenantAccess {
  tenantId: string;
  tenantName: string;
  tenantType: string;
  sceneType: string;
  role: string;
  isOwner: boolean;
}

export interface IsolationContext {
  userId: string;
  tenantId: string;
  role: string;
  isAdmin: boolean;
  isOwner: boolean;
}

export const DATA_ISOLATION_CONFIG = {
  tenantRequiredPaths: [
    '/dashboard',
    '/api/contracts',
    '/api/bills',
    '/api/partners',
    '/api/reminders',
    '/api/folders',
    '/api/assets',
  ],
};

export async function getUserTenantAccess(userId: string): Promise<TenantAccess[]> {
  const roles = await prisma.userTenantRole.findMany({
    where: { userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          type: true,
          sceneType: true,
        },
      },
    },
  });

  return roles.map((r) => ({
    tenantId: r.tenant.id,
    tenantName: r.tenant.name,
    tenantType: r.tenant.type,
    sceneType: r.tenant.sceneType,
    role: r.role,
    isOwner: r.role === 'OWNER',
  }));
}

export async function getDefaultTenantId(userId: string): Promise<string | null> {
  const access = await getUserTenantAccess(userId);
  if (access.length === 0) return null;
  
  const owned = access.find((a) => a.isOwner);
  if (owned) return owned.tenantId;
  
  return access[0].tenantId;
}

export async function createPersonalTenant(userId: string, name?: string): Promise<TenantAccess> {
  const tenant = await prisma.tenant.create({
    data: {
      name: name || '我的合同',
      type: 'PERSONAL',
      sceneType: 'GENERAL',
      ownerId: userId,
    },
  });

  await prisma.userTenantRole.create({
    data: {
      userId,
      tenantId: tenant.id,
      role: 'OWNER',
    },
  });

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantType: tenant.type,
    sceneType: tenant.sceneType,
    role: 'OWNER',
    isOwner: true,
  };
}

export async function ensureUserTenant(userId: string): Promise<TenantAccess> {
  const existing = await getUserTenantAccess(userId);
  if (existing.length > 0) {
    const owned = existing.find((a) => a.isOwner);
    return owned || existing[0];
  }

  return await createPersonalTenant(userId);
}

export async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<TenantAccess | null> {
  const access = await prisma.userTenantRole.findFirst({
    where: { userId, tenantId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          type: true,
          sceneType: true,
        },
      },
    },
  });

  if (!access) return null;

  return {
    tenantId: access.tenant.id,
    tenantName: access.tenant.name,
    tenantType: access.tenant.type,
    sceneType: access.tenant.sceneType,
    role: access.role,
    isOwner: access.role === 'OWNER',
  };
}

export function buildTenantWhere(tenantId: string): { tenantId: string } {
  return { tenantId };
}

export function buildTenantListWhere(tenantIds: string[]): { tenantId: { in: string[] } } {
  return { tenantId: { in: tenantIds } };
}

export function hasPermission(role: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    MANAGER: 2,
    VIEWER: 1,
  };

  const userLevel = roleHierarchy[role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 1;

  return userLevel >= requiredLevel;
}

export async function createTenant(
  userId: string,
  data: {
    name: string;
    type: 'PERSONAL' | 'INDIVIDUAL' | 'ENTERPRISE';
    industry?: string;
    sceneType?: string;
    creditCode?: string;
    contactName?: string;
    contactPhone?: string;
    industryVersionId?: string;
  planId?: string;
}
): Promise<TenantAccess> {
  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      type: data.type,
      industry: data.industry,
      sceneType: data.sceneType || 'GENERAL',
      ownerId: userId,
      creditCode: data.creditCode,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      industryVersionId: data.industryVersionId || null,
      planId: data.planId || null,
    },
  });

  await prisma.userTenantRole.create({
    data: {
      userId,
      tenantId: tenant.id,
      role: 'OWNER',
    },
  });

  // 如果选择了行业版本，自动创建默认启用场景记录
  if (data.industryVersionId) {
    const defaultScenes = await prisma.industryVersionScene.findMany({
      where: { versionId: data.industryVersionId, isDefault: true },
    });
    if (defaultScenes.length > 0) {
      await prisma.tenantEnabledScene.createMany({
        data: defaultScenes.map((vs) => ({
          tenantId: tenant.id,
          sceneId: vs.sceneId,
          enabled: true,
        })),
      });
    }
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantType: tenant.type,
    sceneType: tenant.sceneType,
    role: 'OWNER',
    isOwner: true,
  };
}

export async function addUserToTenant(
  ownerId: string,
  tenantId: string,
  emailOrPhone: string,
  role: string = 'VIEWER'
): Promise<{ success: boolean; error?: string }> {
  const ownerAccess = await validateTenantAccess(ownerId, tenantId);
  if (!ownerAccess || !hasPermission(ownerAccess.role, 'ADMIN')) {
    return { success: false, error: '无权限添加用户' };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  if (!user) {
    return { success: false, error: '用户不存在，请先注册' };
  }

  const existing = await prisma.userTenantRole.findFirst({
    where: { userId: user.id, tenantId },
  });

  if (existing) {
    await prisma.userTenantRole.update({
      where: { id: existing.id },
      data: { role },
    });
    return { success: true };
  }

  await prisma.userTenantRole.create({
    data: { userId: user.id, tenantId, role },
  });

  return { success: true };
}