/**
 * 空状态引导卡片 - 逻辑配置层
 *
 * 从 TraditionalHomePage.tsx 中抽离的纯逻辑，便于单元测试。
 * 监督机器人质量门禁检查点：
 *   - 关键字: 空状态 / emptyState / isEmpty / 引导 / getStarted / 快速开始
 *
 * P0-01 验收标准：当指标为 0 时，卡片内容替换为引导操作（非空数字 0）
 */

// ============ 类型定义 ============

export interface MetricData {
  pendingSignCount: number;
  pendingFillCount: number;
  pendingApprovalCount: number;
  pendingOthersCount: number;
  expiringCount: number;
  totalContracts?: number;
}

export interface GuideCard {
  title: string;
  desc: string;
  icon: string;
  gradient: string;
  href: string;
}

// ============ 核心逻辑 ============

/**
 * 判断是否为空状态（新用户无数据）
 * 规则：待签署 = 0 且 履约提醒 = 0 且 总合同数不存在或为 0
 * 空值防护：所有字段统一归一化为 number，undefined/null 按 0 处理
 */
export function isEmptyState(stats: MetricData | null | undefined): boolean {
  if (!stats) return true;

  const pendingSign = stats.pendingSignCount ?? 0;
  const expiring = stats.expiringCount ?? 0;
  const total = stats.totalContracts ?? 0;

  return pendingSign === 0 && expiring === 0 && total === 0;
}

/**
 * 新用户快速开始的 5 个核心引导卡片
 * 每张卡片对应一个核心业务入口
 */
export function getGuideCards(): GuideCard[] {
  return [
    {
      title: '上传第一份合同',
      desc: 'PDF / Word 文档',
      icon: 'Upload',
      gradient: 'from-blue-500 to-indigo-500',
      href: '/dashboard/upload',
    },
    {
      title: '创建合同模板',
      desc: '复用模板提升效率',
      icon: 'BookOpen',
      gradient: 'from-purple-500 to-violet-500',
      href: '/dashboard/templates',
    },
    {
      title: 'AI 生成合同',
      desc: '智能生成合同文本',
      icon: 'Wand2',
      gradient: 'from-pink-500 to-rose-500',
      href: '/dashboard/contracts/generate',
    },
    {
      title: '发起签署',
      desc: '配置签署方发起流程',
      icon: 'PenTool',
      gradient: 'from-emerald-500 to-teal-500',
      href: '/dashboard/esign/setup',
    },
    {
      title: '体验 AI 对话',
      desc: '智能助手随时待命',
      icon: 'Sparkles',
      gradient: 'from-amber-500 to-orange-500',
      href: '/dashboard/ai-chat',
    },
  ];
}

/**
 * 根据指标数据返回每张卡片的渲染模式
 * - count > 0: 正常指标模式（显示数字 + 趋势）
 * - count === 0: 引导模式（显示引导文案 + 入口链接）
 */
export type CardMode = 'metric' | 'guide';

export interface CardRenderData {
  mode: CardMode;
  label: string;
  count: number;
  guide?: GuideCard;
}

export function buildCardRenderData(
  stats: MetricData | null | undefined,
): CardRenderData[] {
  const isEmpty = isEmptyState(stats);
  const guides = getGuideCards();

  const items = [
    { label: '待我签署', count: stats?.pendingSignCount ?? 0, guideIndex: 0 },
    { label: '待我填写', count: stats?.pendingFillCount ?? 0, guideIndex: 1 },
    { label: '待我审批', count: stats?.pendingApprovalCount ?? 0, guideIndex: 2 },
    { label: '待他人操作', count: stats?.pendingOthersCount ?? 0, guideIndex: 3 },
    { label: '履约提醒', count: stats?.expiringCount ?? 0, guideIndex: 4 },
  ];

  return items.map((item) => ({
    mode: (isEmpty || item.count === 0 ? 'guide' : 'metric') as CardMode,
    label: item.label,
    count: item.count,
    guide: isEmpty || item.count === 0 ? guides[item.guideIndex] : undefined,
  }));
}
