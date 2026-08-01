// ============================================================
// 导航菜单配置 — 多多合同助手 V5.0（73页面全覆盖）
// 顶部一级导航 + 二级下拉菜单
// 6核心菜单 + 1动态行业应用
// ============================================================

/** 场景标识常量 */
export const SCENE = {
  LANDLORD: 'rent_collection',
  RESTAURANT_SUPPLIER: 'supplier_purchase',
  RESTAURANT_PLAN: 'monthly_planning',
  LEGAL_CASE: 'case_management',
  LEGAL_TEMPLATE: 'document_template',
  TECH_IP: 'ip_management',
  TECH_BILLING: 'subscription_billing',
} as const;

/** 套餐级别 */
export type PlanLevel = 'FREE' | 'FREELANCE' | 'LANDLORD' | 'CATERING' | 'LEGAL' | 'TECH' | 'ENTERPRISE';

/** 侧边栏分组标识 */
export const MENU_GROUP = {
  MAIN: 'main',             // 主导航
  ADMIN: 'admin',           // 运营后台
  BUSINESS: 'business',     // 业务管理
  TOOLS: 'tools',           // 工具服务
  WORKSPACE: 'workspace',   // 工作台
} as const;

export type MenuGroupKey = (typeof MENU_GROUP)[keyof typeof MENU_GROUP];

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  group: MenuGroupKey;
  sceneCodes?: string[];
  minPlan?: PlanLevel;
  adminOnly?: boolean;
  children?: MenuItem[];
  /** 二级分组标签（用于管理菜单内分组显示） */
  subGroup?: string;
  badge?: string;
}

/** 套餐级别数值映射 */
export const PLAN_LEVELS: Record<PlanLevel, number> = {
  FREE: 0,
  FREELANCE: 1,
  LANDLORD: 2,
  CATERING: 2,
  LEGAL: 2,
  TECH: 2,
  ENTERPRISE: 3,
};

/** 管理菜单二级分组标签 */
export const MANAGEMENT_SUBGROUPS: Record<string, string> = {
  ORG: '组织管理',
  ASSET: '资产合规',
  SYSTEM: '系统集成',
  BUSINESS: '商业化',
  PERSONAL: '个人',
};

/**
 * 全量菜单配置 — V5.0 七菜单版（73页面全覆盖）
 * 顶部导航：首页 / 合同 / 签署 / 模板 / AI助手 / 管理 / 行业应用(动态)
 */
export const MENU_CONFIG: MenuItem[] = [
  // ======================== 1. 首页 ========================
  {
    key: 'home',
    label: '首页',
    icon: 'Home',
    group: MENU_GROUP.MAIN,
    path: '/dashboard',
    minPlan: 'FREE',
  },

  // ======================== 2. 合同 ========================
  {
    key: 'contracts',
    label: '合同',
    icon: 'FileText',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/contracts',
    minPlan: 'FREE',
    children: [
      { key: 'my-contracts', label: '合同列表', icon: 'FileText', path: '/dashboard/contracts', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'upload', label: '发起合同', icon: 'Upload', path: '/dashboard/upload', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'contracts-editor', label: '合同编辑器', icon: 'Edit3', path: '/dashboard/contracts/editor', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'finance', label: '财务统计', icon: 'CreditCard', path: '/dashboard/finance', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'partners', label: '合作伙伴', icon: 'Users', path: '/dashboard/partners', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'fulfillment', label: '履约管理', icon: 'CheckSquare', path: '/dashboard/fulfillment', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'calendar', label: '到期日历', icon: 'Calendar', path: '/dashboard/calendar', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'reminders', label: '提醒中心', icon: 'Bell', path: '/dashboard/reminders', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      // --- 智能工具组（归档/台账/比对/审查）---
      { key: 'contracts-archive', label: '智能归档', icon: 'Archive', path: '/dashboard/contracts/archive', group: MENU_GROUP.MAIN, subGroup: '智能工具', minPlan: 'FREELANCE', badge: '新' },
      { key: 'ledger', label: '智能台账', icon: 'BookOpen', path: '/dashboard/ledger', group: MENU_GROUP.MAIN, subGroup: '智能工具', minPlan: 'FREELANCE' },
      { key: 'contracts-compare', label: '合同比对', icon: 'GitCompare', path: '/dashboard/contracts/compare', group: MENU_GROUP.MAIN, subGroup: '智能工具', minPlan: 'FREELANCE', badge: '新' },
      { key: 'ai-review', label: '合同审查', icon: 'FileCheck', path: '/dashboard/ai-review', group: MENU_GROUP.MAIN, subGroup: '智能工具', minPlan: 'FREE' },
    ],
  },

  // ======================== 3. 签署 ========================
  {
    key: 'esign',
    label: '签署',
    icon: 'PenTool',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/esign',
    minPlan: 'FREE',
    children: [
      { key: 'esign-center', label: '签署中心', icon: 'FileSignature', path: '/dashboard/esign', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'esign-setup', label: '发起签署', icon: 'PenTool', path: '/dashboard/esign/setup', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'batch-sign', label: '批量签署', icon: 'Layers', path: '/dashboard/esign/batch', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE', badge: '新' },
      { key: 'seal-manage', label: '印章授权', icon: 'Stamp', path: '/dashboard/esign/seals', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'esign-signatures', label: '签名管理', icon: 'PenTool', path: '/dashboard/esign/signatures', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'esign-stats', label: '签署统计', icon: 'BarChart3', path: '/dashboard/esign/stats', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'esign-void', label: '签署作废', icon: 'X', path: '/dashboard/esign/void', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE' },
      { key: 'seal-approval', label: '用印审批', icon: 'CheckSquare', path: '/dashboard/esign/approvals', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE' },
      { key: 'approval-manage', label: '审批管理', icon: 'ClipboardList', path: '/dashboard/esign/approvals', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE' },
    ],
  },

  // ======================== 4. 模板 ========================
  {
    key: 'templates',
    label: '模板',
    icon: 'Layers',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/templates',
    minPlan: 'FREE',
    children: [
      { key: 'contract-templates', label: '模板库', icon: 'FileText', path: '/dashboard/templates', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'clause-library', label: '条款库', icon: 'BookOpen', path: '/dashboard/clauses', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'enterprise-templates', label: '企业模板', icon: 'Layers', path: '/dashboard/enterprise/templates', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE' },
    ],
  },

  // ======================== 5. AI助手 ========================
  {
    key: 'ai-assistant',
    label: 'AI助手',
    icon: 'Bot',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/ai-chat',
    minPlan: 'FREE',
    badge: 'AI',
    children: [
      { key: 'ai-chat', label: 'AI对话', icon: 'MessageSquare', path: '/dashboard/ai-chat', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'ai-generate', label: 'AI生成合同', icon: 'Wand2', path: '/dashboard/contracts/generate', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'knowledge-base', label: '知识库', icon: 'Database', path: '/dashboard/knowledge-base', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'ai-agents', label: '智能体', icon: 'Bot', path: '/dashboard/ai-agents', group: MENU_GROUP.MAIN, minPlan: 'FREELANCE' },
      { key: 'ai-models', label: '模型管理', icon: 'Sparkles', path: '/dashboard/ai-models', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE', badge: '核心' },
      // AUTO-LEARNING-MARK: 自动学习模块入口（v1.0 新增，合并冲突时保留此行）
      { key: 'auto-learning', label: '自动学习', icon: 'Activity', path: '/dashboard/auto-learning', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE', badge: '新' },
      { key: 'auto-upgrade', label: '自动升级', icon: 'RefreshCw', path: '/dashboard/auto-upgrade', group: MENU_GROUP.MAIN, minPlan: 'ENTERPRISE', badge: '新' },
      { key: 'open-platform', label: '开放平台', icon: 'Globe', path: '/dashboard/open-platform', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
    ],
  },

  // ======================== 6. 管理（分组式下拉） ========================
  {
    key: 'management',
    label: '管理',
    icon: 'Settings',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/settings',
    minPlan: 'FREE',
    children: [
      // --- 组织管理组 ---
      { key: 'enterprise-org', label: '组织架构', icon: 'Users', path: '/dashboard/enterprise/org', group: MENU_GROUP.MAIN, subGroup: 'ORG', minPlan: 'ENTERPRISE' },
      { key: 'role-permission', label: '角色权限', icon: 'Shield', path: '/dashboard/enterprise/roles', group: MENU_GROUP.MAIN, subGroup: 'ORG', minPlan: 'ENTERPRISE' },
      { key: 'approval-flow', label: '审批流程', icon: 'CheckSquare', path: '/dashboard/enterprise/flows', group: MENU_GROUP.MAIN, subGroup: 'ORG', minPlan: 'ENTERPRISE' },
      { key: 'tenant-manage', label: '主体管理', icon: 'Building2', path: '/dashboard/tenants', group: MENU_GROUP.MAIN, subGroup: 'ORG', minPlan: 'FREE' },

      // --- 资产合规组 ---
      { key: 'assets', label: '资产管理', icon: 'Database', path: '/dashboard/assets', group: MENU_GROUP.MAIN, subGroup: 'ASSET', minPlan: 'FREELANCE' },
      { key: 'licenses', label: '证照管理', icon: 'BadgeCheck', path: '/dashboard/licenses', group: MENU_GROUP.MAIN, subGroup: 'ASSET', minPlan: 'FREELANCE' },
      { key: 'audit-log', label: '审计日志', icon: 'ShieldCheck', path: '/dashboard/enterprise/audit', group: MENU_GROUP.MAIN, subGroup: 'ASSET', minPlan: 'ENTERPRISE' },
      { key: 'backup', label: '数据备份', icon: 'HardDrive', path: '/dashboard/enterprise/backup', group: MENU_GROUP.MAIN, subGroup: 'ASSET', minPlan: 'ENTERPRISE' },
      { key: 'compliance-center', label: '合规中心', icon: 'ShieldCheck', path: '/dashboard/settings?tab=compliance', group: MENU_GROUP.MAIN, subGroup: 'ASSET', minPlan: 'FREELANCE', badge: '新' },

      // --- 系统集成组 ---
      { key: 'open-platform', label: '开放平台', icon: 'Globe', path: '/dashboard/open-platform', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE', badge: '新' },
      { key: 'api-docs', label: 'API 文档', icon: 'BookOpen', path: '/dashboard/open-platform/api-docs', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE' },
      { key: 'api-stats', label: '调用统计', icon: 'BarChart3', path: '/dashboard/open-platform/stats', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE' },
      { key: 'api-keys-manage', label: 'API 密钥', icon: 'Key', path: '/dashboard/profile?tab=api-keys', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE' },
      { key: 'email-center', label: '邮件中心', icon: 'Mail', path: '/dashboard/email', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE' },
      { key: 'email-inbound', label: '邮件收件', icon: 'Inbox', path: '/dashboard/email/inbound', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREELANCE' },
      { key: 'webhooks', label: 'Webhook', icon: 'GitBranch', path: '/dashboard/webhooks', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'ENTERPRISE' },
      { key: 'rpa-monitor', label: 'RPA自动化', icon: 'Bot', path: '/dashboard/rpa', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREE', badge: '新' },
      { key: 'plugins-market', label: '插件市场', icon: 'Puzzle', path: '/dashboard/plugins', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'FREE' },
      { key: 'enterprise-settings', label: '企业设置', icon: 'Settings', path: '/dashboard/settings?tab=org', group: MENU_GROUP.MAIN, subGroup: 'SYSTEM', minPlan: 'ENTERPRISE' },

      // --- 商业化组 ---
      { key: 'billing-center', label: '计费中心', icon: 'Wallet', path: '/dashboard/settings?tab=subscription', group: MENU_GROUP.MAIN, subGroup: 'BUSINESS', minPlan: 'FREE', badge: '热' },
      { key: 'orders', label: '订单中心', icon: 'CreditCard', path: '/dashboard/orders', group: MENU_GROUP.MAIN, subGroup: 'BUSINESS', minPlan: 'FREE' },
      { key: 'distribution', label: '分销管理', icon: 'Share2', path: '/dashboard/distribution', group: MENU_GROUP.MAIN, subGroup: 'BUSINESS', minPlan: 'FREELANCE', badge: '热' },
      { key: 'tickets', label: '工单系统', icon: 'MessageSquare', path: '/dashboard/tickets', group: MENU_GROUP.MAIN, subGroup: 'BUSINESS', minPlan: 'FREE' },
      { key: 'reports', label: '报表分析', icon: 'BarChart3', path: '/dashboard/reports', group: MENU_GROUP.MAIN, subGroup: 'BUSINESS', minPlan: 'FREELANCE' },

      // --- 个人 ---
      { key: 'profile', label: '个人资料', icon: 'User', path: '/dashboard/profile', group: MENU_GROUP.MAIN, subGroup: 'PERSONAL', minPlan: 'FREE' },
      { key: 'personal-settings', label: '个人设置', icon: 'Settings', path: '/dashboard/settings', group: MENU_GROUP.MAIN, subGroup: 'PERSONAL', minPlan: 'FREE' },
      { key: 'help', label: '操作指引', icon: 'HelpCircle', path: '/dashboard/help', group: MENU_GROUP.MAIN, subGroup: 'PERSONAL', minPlan: 'FREE' },
    ],
  },

  // ======================== 7. 行业应用（动态显示） ========================
  {
    key: 'industry-landlord',
    label: '房东管理',
    icon: 'Building2',
    group: MENU_GROUP.BUSINESS,
    path: '/dashboard/landlord',
    minPlan: 'LANDLORD',
    sceneCodes: [SCENE.LANDLORD],
    children: [
      { key: 'landlord-home', label: '房东首页', icon: 'Building2', path: '/dashboard/landlord', group: MENU_GROUP.BUSINESS, sceneCodes: [SCENE.LANDLORD], minPlan: 'LANDLORD' },
      { key: 'landlord-meters', label: '水电抄表', icon: 'BarChart3', path: '/dashboard/landlord/meters', group: MENU_GROUP.BUSINESS, sceneCodes: [SCENE.LANDLORD], minPlan: 'LANDLORD' },
      { key: 'landlord-deposit', label: '押金管理', icon: 'CreditCard', path: '/dashboard/landlord/deposit', group: MENU_GROUP.BUSINESS, sceneCodes: [SCENE.LANDLORD], minPlan: 'LANDLORD' },
      { key: 'landlord-devices', label: '设备管理', icon: 'HardDrive', path: '/dashboard/landlord/devices', group: MENU_GROUP.BUSINESS, sceneCodes: [SCENE.LANDLORD], minPlan: 'LANDLORD' },
    ],
  },
  {
    key: 'industry-restaurant',
    label: '餐饮管理',
    icon: 'Store',
    group: MENU_GROUP.MAIN,
    path: '/dashboard/catering',
    minPlan: 'FREE',
    children: [
      { key: 'restaurant-home', label: '餐饮首页', icon: 'Store', path: '/dashboard/catering', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'restaurant-suppliers', label: '供应商管理', icon: 'Truck', path: '/dashboard/catering/suppliers', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'restaurant-contracts', label: '采购合同', icon: 'FileText', path: '/dashboard/catering/contracts', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'restaurant-licenses', label: '证照管理', icon: 'BadgeCheck', path: '/dashboard/catering/licenses', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
      { key: 'restaurant-franchise', label: '加盟管理', icon: 'Building2', path: '/dashboard/catering/franchise', group: MENU_GROUP.MAIN, minPlan: 'FREE' },
    ],
  },

  // ======================== 运营后台（仅 admin） ========================
  {
    key: 'admin-overview',
    label: '运营概览',
    icon: 'LayoutDashboard',
    group: MENU_GROUP.ADMIN,
    path: '/admin',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-users',
    label: '用户管理',
    icon: 'Users',
    group: MENU_GROUP.ADMIN,
    path: '/admin/users',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-orders',
    label: '订单管理',
    icon: 'CreditCard',
    group: MENU_GROUP.ADMIN,
    path: '/admin/orders',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-contracts',
    label: '合同管理',
    icon: 'FileText',
    group: MENU_GROUP.ADMIN,
    path: '/admin/contracts',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-plugins',
    label: '插件管理',
    icon: 'Puzzle',
    group: MENU_GROUP.ADMIN,
    path: '/admin/plugins',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-industry',
    label: '行业管理',
    icon: 'Globe',
    group: MENU_GROUP.ADMIN,
    path: '/admin/industry',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-distribution',
    label: '分销管理',
    icon: 'Share2',
    group: MENU_GROUP.ADMIN,
    path: '/admin/distribution',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-distributors',
    label: '分销商管理',
    icon: 'BadgeCheck',
    group: MENU_GROUP.ADMIN,
    path: '/admin/distributors',
    minPlan: 'FREE',
    adminOnly: true,
  },
  {
    key: 'admin-tickets',
    label: '工单管理',
    icon: 'MessageSquare',
    group: MENU_GROUP.ADMIN,
    path: '/admin/tickets',
    minPlan: 'FREE',
    adminOnly: true,
  },
];

/**
 * 分组标签元信息
 */
export const GROUP_LABELS: Record<MenuGroupKey, { label: string; adminOnly?: boolean }> = {
  [MENU_GROUP.MAIN]: { label: '功能导航' },
  [MENU_GROUP.ADMIN]: { label: '运营中心', adminOnly: true },
  [MENU_GROUP.BUSINESS]: { label: '行业应用' },
  [MENU_GROUP.TOOLS]: { label: '工具服务' },
  [MENU_GROUP.WORKSPACE]: { label: '工作台' },
};

/**
 * 分组排序
 */
export const GROUP_ORDER: MenuGroupKey[] = [
  MENU_GROUP.MAIN,
  MENU_GROUP.BUSINESS,
  MENU_GROUP.ADMIN,
];

/** 根据已启用的场景编码筛选菜单 */
export function filterMenusByScenes(items: MenuItem[], enabledScenes: string[]): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.sceneCodes || item.sceneCodes.length === 0) return true;
      return item.sceneCodes.some((s) => enabledScenes.includes(s));
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenusByScenes(item.children, enabledScenes) : undefined,
    }));
}

/** 根据套餐级别筛选菜单 */
export function filterMenusByPlan(items: MenuItem[], currentPlanLevel: number): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.minPlan) return true;
      const requiredLevel = PLAN_LEVELS[item.minPlan] ?? 0;
      return currentPlanLevel >= requiredLevel;
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenusByPlan(item.children, currentPlanLevel) : undefined,
    }));
}

/** lucide-react 图标名 → 组件引用 */
export type MenuIconName =
  | 'Home' | 'LayoutDashboard' | 'FileText' | 'BookOpen' | 'Upload' | 'Bell' | 'Folder'
  | 'Building2' | 'Gauge' | 'Safe' | 'UtensilsCrossed' | 'Truck'
  | 'BadgeCheck' | 'Calendar' | 'Briefcase' | 'FolderOpen' | 'FileType'
  | 'Smartphone' | 'Shield' | 'CreditCard' | 'Settings' | 'List' | 'Layers'
  | 'ArrowDownLeft' | 'ArrowUpRight'
  | 'Users' | 'BarChart3' | 'Building' | 'CheckSquare' | 'Stamp'
  | 'Wallet' | 'PlusCircle' | 'DollarSign' | 'Wand2' | 'PenTool' | 'Mail' | 'Inbox'
  | 'Globe' | 'Puzzle' | 'MessageSquare' | 'Share2' | 'Scan' | 'Monitor'
  | 'GitBranch' | 'FileSpreadsheet' | 'Bot' | 'Database' | 'Sparkles'
  | 'ShieldCheck' | 'User' | 'Activity' | 'AlertTriangle' | 'Grid3X3'
  | 'HardDrive' | 'FileSignature' | 'Store' | 'Info' | 'ClipboardList'
  | 'Edit3' | 'Key' | 'X'
  | 'Archive' | 'GitCompare' | 'FileCheck';
