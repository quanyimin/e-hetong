import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string | null | undefined, pattern: string = 'yyyy-MM-dd'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: zhCN });
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm');
}

/**
 * 相对时间描述
 */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

/**
 * 格式化金额
 */
export function formatAmount(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 检查合同是否即将到期（30天内）
 */
export function isContractExpiring(endDate: Date | string | null | undefined): boolean {
  if (!endDate) return false;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const thirtyDaysLater = addDays(now, 30);
  return isAfter(end, now) && isBefore(end, thirtyDaysLater);
}

/**
 * 检查合同是否已过期
 */
export function isContractExpired(endDate: Date | string | null | undefined): boolean {
  if (!endDate) return false;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return isBefore(end, new Date());
}

/**
 * 生成唯一订单号
 */
export function generateOrderNo(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `HT${dateStr}${random}`;
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 获取文件类型图标标识
 */
export function getFileTypeIcon(type: string | null | undefined): string {
  switch (type?.toLowerCase()) {
    case 'pdf':
      return '📄';
    case 'docx':
    case 'doc':
      return '📝';
    case 'xlsx':
    case 'xls':
      return '📊';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    default:
      return '📁';
  }
}
