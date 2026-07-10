import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, unauthorized } from '@/lib/api-auth';
import { requireOrgAccess, buildFilter } from '@/lib/identity-middleware';

// 默认权限配置
const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  ADMIN: {
    CONTRACT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    LICENSE: ['VIEW', 'EDIT'],
    APPROVAL: ['APPROVE', 'VIEW'],
  },
  EDITOR: {
    CONTRACT: ['VIEW', 'CREATE', 'EDIT'],
    LICENSE: ['VIEW', 'EDIT'],
    APPROVAL: ['VIEW'],
  },
  VIEWER: {
    CONTRACT: ['VIEW'],
    LICENSE: ['VIEW'],
    APPROVAL: ['VIEW'],
  },
};

const ALL_MODULES = ['CONTRACT', 'LICENSE', 'APPROVAL'] as const;
const ALL_ACTIONS: Record<string, string[]> = {
  CONTRACT: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
  LICENSE: ['VIEW', 'EDIT'],
  APPROVAL: ['APPROVE', 'VIEW'],
};

// GET /api/enterprise/roles — 获取角色列表及权限
export async function GET(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    // 查询该租户下各角色的成员数
    const roleCounts = await prisma.userTenantRole.groupBy({
      by: ['role'],
      where: { ...buildFilter(identity) },
      _count: { role: true },
    });
    const countMap = new Map(roleCounts.map(r => [r.role, r._count.role]));

    // 查询自定义权限覆盖
    const customPermissions = await prisma.rolePermission.findMany({
      where: { ...buildFilter(identity) },
    });

    // 构建权限覆盖 Map: role -> module -> actions[]
    const overrideMap = new Map<string, Map<string, string[]>>();
    customPermissions.forEach(cp => {
      if (!overrideMap.has(cp.role)) {
        overrideMap.set(cp.role, new Map());
      }
      overrideMap.get(cp.role)!.set(cp.module, JSON.parse(cp.actions));
    });

    // 合并默认权限和自定义覆盖
    const roles = Object.entries(DEFAULT_PERMISSIONS).map(([roleKey, modules]) => {
      const roleName = roleKey === 'ADMIN' ? '管理员' : roleKey === 'EDITOR' ? '编辑者' : '查看者';
      const roleOverrides = overrideMap.get(roleKey);

      const permissions = ALL_MODULES.map(module => {
        const defaultActions = modules[module] || [];
        const overriddenActions = roleOverrides?.get(module);
        const actions = overriddenActions || defaultActions;

        return {
          module,
          actions: ALL_ACTIONS[module].map(action => ({
            action,
            enabled: actions.includes(action),
          })),
        };
      });

      return {
        role: roleKey,
        name: roleName,
        memberCount: countMap.get(roleKey) || 0,
        permissions,
      };
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/enterprise/roles — 更新角色权限
export async function PUT(request: NextRequest) {
  try {
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    const body = await request.json();
    const { role, module, actions } = body; // role, module, actions: string[]

    if (!role || !module || !Array.isArray(actions)) {
      return NextResponse.json({ code: 1, message: '参数不完整' }, { status: 400 });
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ code: 1, message: '无效的角色' }, { status: 400 });
    }

    if (!ALL_MODULES.includes(module as any)) {
      return NextResponse.json({ code: 1, message: '无效的模块' }, { status: 400 });
    }

    // 校验 actions 合法性
    const validActions = ALL_ACTIONS[module];
    const invalidActions = actions.filter(a => !validActions.includes(a));
    if (invalidActions.length > 0) {
      return NextResponse.json({ code: 1, message: `无效的操作权限: ${invalidActions.join(', ')}` }, { status: 400 });
    }

    // 使用 upsert: 存在则更新，不存在则创建
    await prisma.rolePermission.upsert({
      where: {
        tenantId_role_module: {
          tenantId: identity.orgId,
          role,
          module,
        },
      },
      update: {
        actions: JSON.stringify(actions),
      },
      create: {
        identityType: identity.identityType,
        tenantId: identity.orgId,
        role,
        module,
        actions: JSON.stringify(actions),
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        identityType: identity.identityType,
        tenantId: identity.orgId,
        userId: identity.userId,
        action: 'UPDATE',
        entity: 'TENANT',
        entityId: identity.orgId,
        detail: `更新角色权限: ${role} - ${module}`,
      },
    });

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json({ code: 1, message: '更新失败' }, { status: 500 });
  }
}
