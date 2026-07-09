// 角色等级（数字越大权限越高）
export const ROLE_LEVELS = {
  READONLY: 0,   // 只读：仅查看
  STAFF: 1,      // 业务员：查看 + 基础操作
  FINANCE: 2,    // 财务：查看 + 收支录入/审核
  ADMIN: 3,      // 管理员：全部管理权限（除删除主体）
  OWNER: 4,      // 创建者：完全控制
} as const;

export type RoleLevel = keyof typeof ROLE_LEVELS;

// 中文名称映射
export const ROLE_LABELS: Record<RoleLevel, string> = {
  READONLY: '只读',
  STAFF: '业务员',
  FINANCE: '财务',
  ADMIN: '管理员',
  OWNER: '创建者',
};

// 权限操作定义
export type Permission =
  | 'contract:view'     // 查看合同
  | 'contract:create'   // 创建合同
  | 'contract:edit'     // 编辑合同
  | 'contract:delete'   // 删除合同
  | 'finance:view'      // 查看财务
  | 'finance:entry'     // 收支录入
  | 'finance:audit'     // 审核
  | 'template:manage'   // 模板管理
  | 'export:data'       // 导出数据
  | 'member:manage'     // 成员管理
  | 'tenant:delete';    // 删除主体

// 各角色拥有的权限
const ROLE_PERMISSIONS: Record<RoleLevel, Permission[]> = {
  READONLY: ['contract:view', 'finance:view'],
  STAFF: ['contract:view', 'contract:create', 'contract:edit', 'finance:view'],
  FINANCE: ['contract:view', 'contract:create', 'contract:edit', 'finance:view', 'finance:entry', 'finance:audit', 'export:data'],
  ADMIN: ['contract:view', 'contract:create', 'contract:edit', 'contract:delete', 'finance:view', 'finance:entry', 'finance:audit', 'template:manage', 'export:data', 'member:manage'],
  OWNER: ['contract:view', 'contract:create', 'contract:edit', 'contract:delete', 'finance:view', 'finance:entry', 'finance:audit', 'template:manage', 'export:data', 'member:manage', 'tenant:delete'],
};

// 检查角色是否有指定权限
export function hasPermission(role: string, permission: Permission): boolean {
  const normalizedRole = role.toUpperCase() as RoleLevel;
  const perms = ROLE_PERMISSIONS[normalizedRole];
  if (!perms) return false;
  return perms.includes(permission);
}

// 检查角色等级是否满足最低要求
export function hasMinRole(role: string, minRole: RoleLevel): boolean {
  const userLevel = ROLE_LEVELS[role.toUpperCase() as RoleLevel] ?? -1;
  const requiredLevel = ROLE_LEVELS[minRole];
  return userLevel >= requiredLevel;
}
