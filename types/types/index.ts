import type { User, Contract, Reminder, Order } from '@prisma/client';

// ===========================================
// 扩展类型定义
// ===========================================

/** 带会员等级的 Session User */
export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  memberLevel: string;
  memberExpireAt: Date | null;
  role: string;
}

/** 合同列表查询参数 */
export interface ContractQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  sortBy?: 'createdAt' | 'endDate' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

/** 分页结果 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 合同列表项 */
export interface ContractListItem extends Contract {
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

/** 合同详情（含关联数据） */
export interface ContractDetail extends Contract {
  reminders: Reminder[];
}

/** 合同上传返回结果 */
export interface UploadResult {
  url: string;
  fileType: string;
  fileName: string;
}

/** AI 解析结果 */
export interface AIParseResult {
  contractName?: string;
  contractType?: string;
  partyA?: string;
  partyB?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  keyClauses?: string[];
  riskAlerts?: string[];
  summary?: string;
}

/** 订单信息 */
export interface OrderInfo extends Order {
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  totalContracts: number;
  expiringContracts: number;
  totalReminders: number;
  thisMonthUploads: number;
  contractsByType: { type: string; count: number }[];
  monthlyUploads: { month: string; count: number }[];
}

/** API 统一响应 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  error?: string;
}

/** 全局表单状态 */
export interface FormState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}
