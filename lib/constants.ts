// ===========================================
// 全局常量定义
// ===========================================

/** 会员等级 */
export const MEMBER_LEVELS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type MemberLevel = (typeof MEMBER_LEVELS)[keyof typeof MEMBER_LEVELS];

/** 会员等级标签 */
export const MEMBER_LEVEL_LABELS: Record<MemberLevel, string> = {
  free: '免费版',
  pro: '专业版',
  enterprise: '企业版',
};

/** 套餐类型 */
export const PLAN_TYPES = {
  PRO_MONTHLY: 'pro_monthly',
  PRO_YEARLY: 'pro_yearly',
  ENTERPRISE_MONTHLY: 'enterprise_monthly',
  ENTERPRISE_YEARLY: 'enterprise_yearly',
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];

/** 套餐定价（单位：元） */
export const PLAN_PRICES: Record<PlanType, number> = {
  pro_monthly: 49,
  pro_yearly: 499,
  enterprise_monthly: 199,
  enterprise_yearly: 1999,
};

/** 套餐权益 */
export const PLAN_FEATURES = {
  [PLAN_TYPES.PRO_MONTHLY]: {
    name: '专业版 - 月付',
    contractLimit: 100,
    aiParseLimit: 50,
    storageSize: '1GB',
    supportType: '在线客服',
  },
  [PLAN_TYPES.PRO_YEARLY]: {
    name: '专业版 - 年付',
    contractLimit: 100,
    aiParseLimit: 50,
    storageSize: '1GB',
    supportType: '在线客服',
    discount: '省 2 个月',
  },
  [PLAN_TYPES.ENTERPRISE_MONTHLY]: {
    name: '企业版 - 月付',
    contractLimit: 1000,
    aiParseLimit: 500,
    storageSize: '10GB',
    supportType: '专属客服',
  },
  [PLAN_TYPES.ENTERPRISE_YEARLY]: {
    name: '企业版 - 年付',
    contractLimit: 1000,
    aiParseLimit: 500,
    storageSize: '10GB',
    supportType: '专属客服',
    discount: '省 2 个月',
  },
};

/** 合同类型 */
export const CONTRACT_TYPES = [
  { value: 'sale', label: '买卖合同' },
  { value: 'lease', label: '租赁合同' },
  { value: 'labor', label: '劳动合同' },
  { value: 'service', label: '服务合同' },
  { value: 'loan', label: '借款合同' },
  { value: 'guarantee', label: '担保合同' },
  { value: 'other', label: '其他' },
] as const;

/** 解析状态 */
export const PARSE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ParseStatus = (typeof PARSE_STATUS)[keyof typeof PARSE_STATUS];

export const PARSE_STATUS_LABELS: Record<ParseStatus, string> = {
  pending: '待解析',
  processing: '解析中',
  completed: '已完成',
  failed: '解析失败',
};

/** 提醒类型 */
export const REMINDER_TYPES = {
  EXPIRE: 'expire',
  REVIEW: 'review',
  CUSTOM: 'custom',
} as const;

export type ReminderType = (typeof REMINDER_TYPES)[keyof typeof REMINDER_TYPES];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  expire: '到期提醒',
  review: '复核提醒',
  custom: '自定义',
};

/** 发送状态 */
export const SEND_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

/** 支付状态 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  failed: '支付失败',
  refunded: '已退款',
};

/** 用户角色 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** 路由 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CONTRACTS: '/dashboard/contracts',
  REMINDERS: '/dashboard/reminders',
  SETTINGS: '/dashboard/settings',
  PRICING: '/pricing',
  ADMIN: '/admin',
} as const;

/** Supabase Storage Bucket */
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'contracts';
