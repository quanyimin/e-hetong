// ============================================================
// 行业菜单配置 — 通用底座 + 场景插件
// 每个菜单项可关联 sceneCodes（为空=通用），非通用菜单仅在
// 该场景启用时显示
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

export interface MenuItem {
  key: string;
  label: string;
  icon: string;           // lucide-react 图标名
  path: string;
  sceneCodes?: string[];  // 依赖的场景编码，空或未定义=通用
  minPlan?: PlanLevel;    // 最低套餐级别，空或未定义=通用
  children?: MenuItem[];
}

/** 套餐级别数值映射（数值越大权限越高） */
export const PLAN_LEVELS: Record<PlanLevel, number> = {
  FREE: 0,
  FREELANCE: 1,
  LANDLORD: 2,
  CATERING: 2,
  LEGAL: 2,
  TECH: 2,
  ENTERPRISE: 3,
};

/**
 * 全量菜单配置
 * 布局层根据当前租户启用的场景筛选 sceneCodes 匹配的项
 */
export const MENU_CONFIG: MenuItem[] = [
  // ======================== 通用底座 ========================
  {
    key: 'dashboard',
    label: '概览',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    minPlan: 'FREE',
  },
  {
    key: 'contracts',
    label: '合同管理',
    icon: 'FileText',
    path: '/dashboard/contracts',
    minPlan: 'FREE',
    children: [
      { key: 'contract-list', label: '全部合同', icon: 'List', path: '/dashboard/contracts', minPlan: 'FREE' },
      { key: 'templates', label: '模板库', icon: 'Layers', path: '/dashboard/contracts/templates', minPlan: 'FREE' },
    ],
  },
  {
    key: 'ledger',
    label: '财务台账',
    icon: 'BookOpen',
    path: '/dashboard/ledger',
    minPlan: 'FREELANCE',
    children: [
      { key: 'receivable', label: '应收管理', icon: 'ArrowDownLeft', path: '/dashboard/ledger?tab=receivable', minPlan: 'FREELANCE' },
      { key: 'payable', label: '应付管理', icon: 'ArrowUpRight', path: '/dashboard/ledger?tab=payable', minPlan: 'FREELANCE' },
    ],
  },
  { key: 'upload', label: '上传合同', icon: 'Upload', path: '/dashboard/upload', minPlan: 'FREE' },
  { key: 'reminders', label: '提醒管理', icon: 'Bell', path: '/dashboard/reminders', minPlan: 'FREE' },
  { key: 'folders', label: '合同分类', icon: 'Folder', path: '/dashboard/folders', minPlan: 'FREE' },

  // ======================== 合作方管理 (FREELANCE+) ========================
  { key: 'partners', label: '合作方管理', icon: 'Users', path: '/dashboard/partners', minPlan: 'FREELANCE' },

  // ======================== 数据报表 (FREELANCE+) ========================
  { key: 'reports', label: '数据报表', icon: 'BarChart3', path: '/dashboard/reports', minPlan: 'FREELANCE' },

  // ======================== 房东收租插件 ========================
  {
    key: 'landlord',
    label: '房东工作台',
    icon: 'Home',
    path: '/dashboard/landlord',
    minPlan: 'LANDLORD',
    sceneCodes: [SCENE.LANDLORD],
    children: [
      { key: 'houses', label: '房源管理', icon: 'Building2', path: '/dashboard/landlord', minPlan: 'LANDLORD', sceneCodes: [SCENE.LANDLORD] },
      { key: 'meters', label: '水电读数', icon: 'Gauge', path: '/dashboard/landlord/meters', minPlan: 'LANDLORD', sceneCodes: [SCENE.LANDLORD] },
      { key: 'deposit', label: '押金管理', icon: 'Safe', path: '/dashboard/landlord/deposit', minPlan: 'LANDLORD', sceneCodes: [SCENE.LANDLORD] },
    ],
  },

  // ======================== 餐饮管理插件 ========================
  {
    key: 'catering',
    label: '餐饮工作台',
    icon: 'UtensilsCrossed',
    path: '/dashboard/restaurant',
    minPlan: 'CATERING',
    sceneCodes: [SCENE.RESTAURANT_SUPPLIER, SCENE.RESTAURANT_PLAN],
    children: [
      { key: 'suppliers', label: '供应商管理', icon: 'Truck', path: '/dashboard/restaurant', minPlan: 'CATERING', sceneCodes: [SCENE.RESTAURANT_SUPPLIER] },
      { key: 'licenses', label: '证照管理', icon: 'BadgeCheck', path: '/dashboard/restaurant/licenses', minPlan: 'CATERING', sceneCodes: [SCENE.RESTAURANT_SUPPLIER] },
      { key: 'planning', label: '月度计划', icon: 'Calendar', path: '/dashboard/restaurant/plan', minPlan: 'CATERING', sceneCodes: [SCENE.RESTAURANT_PLAN] },
    ],
  },

  // ======================== 律所版插件 ========================
  {
    key: 'legal',
    label: '律所工作台',
    icon: 'Briefcase',
    path: '/dashboard/cases',
    minPlan: 'LEGAL',
    sceneCodes: [SCENE.LEGAL_CASE, SCENE.LEGAL_TEMPLATE],
    children: [
      { key: 'cases', label: '案件管理', icon: 'FolderOpen', path: '/dashboard/cases', minPlan: 'LEGAL', sceneCodes: [SCENE.LEGAL_CASE] },
      { key: 'legal-docs', label: '文书模板', icon: 'FileType', path: '/dashboard/templates', minPlan: 'LEGAL', sceneCodes: [SCENE.LEGAL_TEMPLATE] },
    ],
  },

  // ======================== 科技/互联网版插件 ========================
  {
    key: 'tech',
    label: '科技工作台',
    icon: 'Smartphone',
    path: '/dashboard/ip',
    minPlan: 'TECH',
    sceneCodes: [SCENE.TECH_IP, SCENE.TECH_BILLING],
    children: [
      { key: 'ip', label: '知识产权', icon: 'Shield', path: '/dashboard/ip', minPlan: 'TECH', sceneCodes: [SCENE.TECH_IP] },
      { key: 'billing', label: '订阅计费', icon: 'CreditCard', path: '/dashboard/billing', minPlan: 'TECH', sceneCodes: [SCENE.TECH_BILLING] },
    ],
  },

  // ======================== 企业管理 (ENTERPRISE) ========================
  {
    key: 'enterprise',
    label: '企业管理',
    icon: 'Building',
    path: '/dashboard/enterprise',
    minPlan: 'ENTERPRISE',
    children: [
      { key: 'approval', label: '审批流程', icon: 'CheckSquare', path: '/dashboard/enterprise/approval', minPlan: 'ENTERPRISE' },
      { key: 'seals', label: '印章管理', icon: 'Stamp', path: '/dashboard/enterprise/seals', minPlan: 'ENTERPRISE' },
    ],
  },

  // ======================== 管理 ========================
  { key: 'tenants', label: '主体管理', icon: 'Building2', path: '/dashboard/tenants', minPlan: 'FREE' },
  { key: 'settings', label: '设置', icon: 'Settings', path: '/dashboard/settings', minPlan: 'FREE' },
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

/** lucide-react 图标名 → 组件引用（由 layout import） */
export type MenuIconName =
  | 'LayoutDashboard' | 'FileText' | 'BookOpen' | 'Upload' | 'Bell' | 'Folder'
  | 'Home' | 'Building2' | 'Gauge' | 'Safe' | 'UtensilsCrossed' | 'Truck'
  | 'BadgeCheck' | 'Calendar' | 'Briefcase' | 'FolderOpen' | 'FileType'
  | 'Smartphone' | 'Shield' | 'CreditCard' | 'Settings' | 'List' | 'Layers'
  | 'ArrowDownLeft' | 'ArrowUpRight'
  | 'Users' | 'BarChart3' | 'Building' | 'CheckSquare' | 'Stamp'
  | 'Wallet' | 'PlusCircle' | 'DollarSign';
