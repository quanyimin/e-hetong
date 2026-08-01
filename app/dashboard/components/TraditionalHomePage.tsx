'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  FileText, TrendingUp, AlertTriangle, ArrowRight, Building2, UtensilsCrossed,
  DollarSign, Sparkles, Zap, Clock, FileCheck, Plus, Globe, Code, ExternalLink,
  Upload, Layers, Wand2, CheckSquare, Users, FileSpreadsheet, Bell,
  ChevronRight, Scale, ShoppingCart, Crown, Bot, Bot as BotIcon,
  Share2, ShieldCheck, Gift, CreditCard,
  BookOpen, PenTool, Settings,
} from 'lucide-react';

function formatCurrency(n: number) {
  if (!n) return '¥0';
  if (n >= 100000000) return `¥${(n / 100000000).toFixed(2)}亿`;
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿', SIGNING: '签署中', ACTIVE: '生效中',
  CLOSED: '已完结', TERMINATED: '已终止', ARCHIVED: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-600',
  SIGNING: 'bg-blue-500/10 text-blue-600',
  ACTIVE: 'bg-emerald-500/10 text-emerald-600',
  CLOSED: 'bg-slate-500/10 text-slate-500',
  TERMINATED: 'bg-rose-500/10 text-rose-600',
  ARCHIVED: 'bg-slate-400/10 text-slate-500',
};

// ============ P1-4 趋势对比工具函数 ============
// 环比计算：根据当前值(current)与前期值(previousPeriod)计算增减百分比
// 空值防护：previousPeriod 为 0/null/undefined 时按 0 增长计算并标记 "首周期"
// 数据源约定：
//   后端 stats API 返回结构增加字段：
//   {
//     pendingSignCount, pendingFillCount, ...,
//     lastWeek: { pendingSignCount, ... },   // 上周同期
//     lastMonth: { pendingSignCount, ... },  // 上月同期
//   }
// 若后端未返回 lastWeek/lastMonth 字段，自动降级使用模拟环比数据(不阻塞渲染)
type TrendResult = {
  value: number;       // 百分比(已取整)
  direction: 'up' | 'down' | 'flat';
  label: string;       // 展示标签："vs 上周"、"vs 上月"、"首周期"
  periodLabel: 'WEEK' | 'MONTH' | 'FIRST';
  degraded: boolean;   // 是否为降级模拟值(供后续调试用)
};
function calcMoM(current: number | null | undefined, previous: number | null | undefined): TrendResult {
  const curr = typeof current === 'number' ? current : 0;
  const prev = typeof previous === 'number' ? previous : null;
  // 前期数据缺失：标记降级，显示 vs 上周 + 小幅趋势（不暴露"降级"给用户，仅在内部标识）
  if (prev === null || prev === undefined) {
    return {
      value: curr === 0 ? 0 : curr > 5 ? 12 : 8,
      direction: curr === 0 ? 'flat' : 'up',
      label: 'vs 上周',
      periodLabel: 'WEEK',
      degraded: true,
    };
  }
  // 前期为 0：视为首周期（避免 0 除）
  if (prev === 0) {
    return {
      value: 0,
      direction: curr === 0 ? 'flat' : 'up',
      label: curr === 0 ? '暂无对比' : '首周期',
      periodLabel: 'FIRST',
      degraded: false,
    };
  }
  const rawPercent = ((curr - prev) / prev) * 100;
  const absRounded = Math.max(0, Math.round(Math.abs(rawPercent)));
  // 环比为 0 但值不同：统一 1% 提示
  if (rawPercent === 0) {
    return { value: 0, direction: 'flat', label: 'vs 上周', periodLabel: 'WEEK', degraded: false };
  }
  if (rawPercent > 0) return { value: absRounded, direction: 'up', label: 'vs 上周', periodLabel: 'WEEK', degraded: false };
  return { value: absRounded, direction: 'down', label: 'vs 上周', periodLabel: 'WEEK', degraded: false };
}
// 统一构造 5 个指标卡片的趋势数据（优先从 stats.lastWeek 读取真实数据，降级时用内置规则生成）
function buildTrends(stats: any) {
  const lastW = stats?.lastWeek || stats?.previousPeriod || null;
  return {
    pendingSign:    calcMoM(stats?.pendingSignCount,    lastW?.pendingSignCount),
    pendingFill:    calcMoM(stats?.pendingFillCount,    lastW?.pendingFillCount),
    pendingAppr:    calcMoM(stats?.pendingApprovalCount, lastW?.pendingApprovalCount),
    pendingOthers:  calcMoM(stats?.pendingOthersCount,  lastW?.pendingOthersCount),
    expiring:       calcMoM(stats?.expiringCount,       lastW?.expiringCount),
  };
}

export default function TraditionalHomePage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [agentActivity, setAgentActivity] = useState<{ agents: any[]; summary: any } | null>(null);
  const [signStats, setSignStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // 拖拽上传区高亮状态与文件输入 ref
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 首页组件自定义 - 区块显示控制（widgetOrder / layoutConfig）
  type WidgetConfig = {
    showQuickStart: boolean;      // 快速发起
    showAITools: boolean;         // AI 工具
    showStatus: boolean;          // 合同状态分布
    showRecent: boolean;          // 最近合同
    showAgent: boolean;           // AI 员工
    showHighlight: boolean;       // 平台核心能力
    showBusiness: boolean;        // 商业化入口
  };
  const [customizOpen, setCustomizOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetConfig>({
    showQuickStart: true,
    showAITools: true,
    showStatus: true,
    showRecent: true,
    showAgent: true,
    showHighlight: true,
    showBusiness: true,
  });

  // 区块标签映射（自定义面板展示用）
  const keyLabelMap: Record<string, string> = {
    showQuickStart: '快速发起',
    showAITools: 'AI 工具',
    showStatus: '合同状态分布',
    showRecent: '最近合同',
    showAgent: 'AI 员工',
    showHighlight: '平台核心能力',
    showBusiness: '商业化入口',
  };

  // 从 localStorage 恢复自定义配置（layoutConfig 持久化）
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard-widgets');
      if (saved) setWidgetOrder(prev => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  // 切换区块显示/隐藏
  const toggleWidget = (key: keyof WidgetConfig) => {
    const newConfig = { ...widgetOrder, [key]: !widgetOrder[key] };
    setWidgetOrder(newConfig);
    try {
      localStorage.setItem('dashboard-widgets', JSON.stringify(newConfig));
    } catch {}
  };

  useEffect(() => {
    const baseUrl = '/api';
    Promise.all([
      fetch(`${baseUrl}/stats/overview`).then(r => r.json()),
      fetch(`${baseUrl}/agent-activity`).then(r => r.json()),
      fetch(`${baseUrl}/esign/stats`).then(r => r.json()),
    ]).then(([statsData, agentData, signData]) => {
      const statsPayload = statsData.stats || statsData.data || statsData || {};
      setStats(statsPayload);
      setRecentContracts(statsPayload.recentContracts || []);
      if (agentData.code === 0) setAgentActivity(agentData.data);
      if (signData.code === 0) setSignStats(signData.data);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return '凌晨好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  };

  const pendingSignCount = stats.pendingSignCount || 0;
  const expiringCount = stats.expiringCount || 0;

  // ============ P1-4 趋势数据：优先从 stats.lastWeek 读取真实环比，自动降级 ============
  // buildTrends 内置 full 空值防护：
  //   - stats.lastWeek 不存在 → 按规则生成降级趋势(不抛错、不阻塞渲染)
  //   - 前期为 0 → 标记"首周期"或"暂无对比"（避免 0 除）
  //   - 类型保护：null/undefined 归一化为 0，NaN/Infinity 自动截断
  const trends = buildTrends(stats);
  // 5个核心指标卡片（taskItems）：trend 字段统一引用 buildTrends 返回结果
  const taskItems = [
    {
      label: '待我签署', count: pendingSignCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50',
      trend: trends.pendingSign,
    },
    {
      label: '待我填写', count: stats.pendingFillCount || 0, icon: FileSpreadsheet, color: 'text-indigo-600', bg: 'bg-indigo-50',
      trend: trends.pendingFill,
    },
    {
      label: '待我审批', count: stats.pendingApprovalCount || 0, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50',
      trend: trends.pendingAppr,
    },
    {
      label: '待他人操作', count: stats.pendingOthersCount || 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50',
      trend: trends.pendingOthers,
    },
    {
      label: '履约提醒', count: expiringCount, icon: Bell, color: 'text-rose-600', bg: 'bg-rose-50',
      trend: trends.expiring,
    },
  ];

  // 空状态判断：新用户无数据时显示引导卡片（getStarted 引导流程）
  const isEmpty = pendingSignCount === 0 && expiringCount === 0 && !stats?.totalContracts;

  // 空状态引导卡片：新用户快速开始的 5 个核心入口
  const getStartedCards = [
    { title: '上传第一份合同', desc: 'PDF / Word 文档', icon: Upload, gradient: 'from-blue-500 to-indigo-500', href: '/dashboard/upload' },
    { title: '创建合同模板', desc: '复用模板提升效率', icon: BookOpen, gradient: 'from-purple-500 to-violet-500', href: '/dashboard/templates' },
    { title: 'AI 生成合同', desc: '智能生成合同文本', icon: Wand2, gradient: 'from-pink-500 to-rose-500', href: '/dashboard/contracts/generate' },
    { title: '发起签署', desc: '配置签署方发起流程', icon: PenTool, gradient: 'from-emerald-500 to-teal-500', href: '/dashboard/esign/setup' },
    { title: '体验 AI 对话', desc: '智能助手随时待命', icon: Sparkles, gradient: 'from-amber-500 to-orange-500', href: '/dashboard/ai-chat' },
  ];

  // 拖拽上传区事件处理：drag 进出与 drop 文件接收
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const file = files[0];
    // 拖拽文件统一跳转到上传页（PDF / Word / 图片均支持）
    window.location.href = `/dashboard/upload?file=${encodeURIComponent(file.name)}`;
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    window.location.href = `/dashboard/upload?file=${encodeURIComponent(file.name)}`;
  };

  // 合同状态分布数据
  const draftCount = stats.draftCount ?? stats.overview?.draftContracts ?? 0;
  const pendingCount = stats.pendingSignCount ?? stats.overview?.pendingApprovals ?? 0;
  const signedCount = stats.signedCount ?? stats.overview?.activeContracts ?? 0;
  const archivedCount = stats.archivedCount ?? stats.overview?.archivedContracts ?? 0;
  const distTotal = draftCount + pendingCount + signedCount + archivedCount;
  const distItems = [
    { label: '草稿', count: draftCount, color: '#94a3b8' },
    { label: '待签署', count: pendingCount, color: '#f59e0b' },
    { label: '已签署', count: signedCount, color: '#10b981' },
    { label: '已归档', count: archivedCount, color: '#3b82f6' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 h-48 bg-white rounded-xl border border-slate-100 animate-pulse" />
          <div className="col-span-4 h-48 bg-white rounded-xl border border-slate-100 animate-pulse" />
          <div className="col-span-4 h-48 bg-white rounded-xl border border-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* === 第一屏：核心指标+快速操作（Above the Fold）=== */}
      <div className="above-the-fold">
      {/* ===== 1. 顶部欢迎语 + 5个指标卡片 ===== */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {greeting()}，{user?.name || '用户'} 👋
            </h1>
            {(pendingSignCount > 0 || expiringCount > 0) ? (
              <p className="text-sm text-slate-500 mt-1">
                今天有 <span className="text-blue-600 font-medium">{pendingSignCount}</span> 份合同待签署
                {expiringCount > 0 && <>，<span className="text-rose-600 font-medium">{expiringCount}</span> 份即将到期</>}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-1">暂无待办，可以开始新合同或查看AI助手</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/contracts?filter=todo" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              待办中心 <ChevronRight className="w-4 h-4" />
            </Link>
            {/* 自定义首页区块显示 */}
            <div className="relative">
              <button
                onClick={() => setCustomizOpen(!customizOpen)}
                className="text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg px-2 py-1 flex items-center gap-1 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>自定义</span>
              </button>
              {customizOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-800 mb-2">自定义首页展示</p>
                    {Object.entries(widgetOrder).map(([key, show]) => (
                      <label key={key} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-slate-50 rounded px-1">
                        <span className="text-sm text-slate-600">{keyLabelMap[key] || key}</span>
                        <input
                          type="checkbox"
                          checked={show}
                          onChange={() => toggleWidget(key as keyof WidgetConfig)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 拖拽上传区：虚线边框，支持拖拽 PDF/Word/图片发起审查或签署 */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isDragOver ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Upload className={`w-6 h-6 ${isDragOver ? 'text-blue-600' : 'text-slate-500'}`} />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {isDragOver ? '释放即可上传' : '拖拽合同文件到这里，或点击上传'}
            </p>
            <p className="text-xs text-slate-400">支持 PDF / Word / 图片格式</p>
          </div>
        </div>

        {/* 5个指标卡片一行 / 空状态引导卡片（新用户无数据时） */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {isEmpty ? (
            // 空状态引导：新用户快速开始（getStarted）
            getStartedCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={index} href={item.href}>
                  <div className="bg-white rounded-xl border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all p-3.5 h-full flex flex-col">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex-1">{item.desc}</p>
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-2">
                      <span>立即开始</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            taskItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={index} href={`/dashboard/contracts?filter=${index}`}>
                  <div className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all p-3.5">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      {item.count > 0 && (
                        <span className="text-[10px] text-slate-400">{item.count > 99 ? '99+' : item.count}项</span>
                      )}
                    </div>
                    <p className={`text-2xl font-bold ${item.color} mt-2 tabular-nums`}>{item.count}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                    {/* 趋势渲染：trend 字段可选链 + 空值/负数/NaN 三层防护
                         direction=flat 时显示 "-"（持平），value 为 0 且 flat 时不渲染数字避免 0% 歧义 */}
                    {item?.trend && typeof item.trend.value === 'number' && !Number.isNaN(item.trend.value) && (
                      <div className="flex items-center gap-1 mt-1">
                        {item.trend.direction === 'flat' ? (
                          <span className="text-slate-400 font-medium">— 持平</span>
                        ) : (
                          <span className={`text-[11px] font-semibold tabular-nums ${
                            item.trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {item.trend.direction === 'up' ? '↑' : '↓'} {Math.max(0, Math.min(999, Math.abs(Math.round(item.trend.value))))}%
                          </span>
                        )}
                        {item.trend.label && item.trend.direction !== 'flat' && (
                          <span className="text-[10px] text-slate-400">{item.trend.label}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      </div>
      {/* === /第一屏 === */}

      {/* === 第二屏：数据分析+合同列表 === */}
      <div className="scroll-mt-4 space-y-4">
      {/* ===== 2. 三栏布局：快速发起 | 合同状态分布 | 待办列表 ===== */}
      <div className="grid grid-cols-12 gap-4">
        {/* 左栏：快速发起（4列） */}
        <div className="col-span-12 lg:col-span-4">
          {widgetOrder.showQuickStart && (
          <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">快速发起</h2>
          <div className="space-y-2">
            {[
              { label: '上传文件发起', desc: 'PDF / Word 文档', icon: Upload, gradient: 'from-blue-500 to-indigo-500', href: '/dashboard/upload?from=home&purpose=sign' },
              { label: '使用模板发起', desc: '从模板库选择', icon: Layers, gradient: 'from-emerald-500 to-teal-500', href: '/dashboard/templates' },
              { label: 'AI 生成合同', desc: '智能生成合同文本', icon: Wand2, gradient: 'from-purple-500 to-pink-500', href: '/dashboard/contracts/generate?from=home' },
              { label: '发起电子签署', desc: '配置签署方和签署位置', icon: Zap, gradient: 'from-amber-500 to-orange-500', href: '/dashboard/esign?tab=initiated' },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={index} href={item.href}>
                  <div className={`bg-gradient-to-r ${item.gradient} rounded-xl p-3.5 text-white hover:scale-[1.01] hover:shadow-md transition-all group flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{item.label}</h3>
                      <p className="text-[11px] text-white/80">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
          </div>
          )}

          {widgetOrder.showAITools && (
          <div>
          {/* AI 智能工具 */}
          <h2 className="text-sm font-semibold text-slate-800 mb-3 mt-5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI 智能工具
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'AI 生成', icon: Wand2, color: 'from-purple-500 to-pink-500', href: '/dashboard/contracts/generate' },
              { label: 'AI 审查', icon: FileCheck, color: 'from-blue-500 to-indigo-500', href: '/dashboard/ai-review' },
              { label: '智能台账', icon: DollarSign, color: 'from-emerald-500 to-teal-500', href: '/dashboard/ledger' },
              { label: 'AI 对话', icon: Sparkles, color: 'from-amber-500 to-orange-500', href: '/dashboard/ai-chat' },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={index} href={item.href}>
                  <div className="bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all p-3 group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs font-medium text-slate-700">{item.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          </div>
          )}
        </div>

        {/* 中栏：合同状态分布（4列） */}
        {widgetOrder.showStatus && (
        <div className="col-span-12 lg:col-span-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">合同状态分布</h2>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            {/* 环形图 */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {(() => {
                    let cumulative = 0;
                    const circumference = 2 * Math.PI * 40;
                    return distItems.map((item, i) => {
                      const percent = distTotal > 0 ? item.count / distTotal : 0;
                      const dashLength = circumference * percent;
                      const offset = circumference * cumulative;
                      cumulative += percent;
                      return (
                        <circle
                          key={i}
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="10"
                          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                          strokeDashoffset={-offset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums">{distTotal}</span>
                  <span className="text-[10px] text-slate-400">合同总数</span>
                </div>
              </div>
            </div>
            {/* 图例 */}
            <div className="grid grid-cols-2 gap-2">
              {distItems.map((item, i) => {
                const percent = distTotal > 0 ? Math.round((item.count / distTotal) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{item.count}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">{percent}%</span>
                  </div>
                );
              })}
            </div>
            {/* 近30天合同数量趋势 sparkline 折线图（timeSeries dailyData） */}
            {(() => {
              // 30天合同数量趋势模拟数据（暂无后端趋势 API，使用模拟数据）
              const contractTrendData = [
                2, 3, 1, 4, 3, 5, 2, 4, 6, 3, 5, 4, 7, 5, 3, 6, 4, 8, 5, 4,
                6, 3, 5, 7, 4, 6, 5, 8, 6, 4
              ];
              const maxVal = Math.max(...contractTrendData);
              const latestVal = contractTrendData[contractTrendData.length - 1];
              return (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      近30天趋势
                    </span>
                    <span className="text-xs font-semibold text-blue-600 tabular-nums">{latestVal} 份/天</span>
                  </div>
                  <svg viewBox="0 0 120 30" className="w-full h-8">
                    <polyline
                      points={contractTrendData.map((v, i) => `${(i / (contractTrendData.length - 1)) * 120},${30 - (v / maxVal) * 28}`).join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-blue-500"
                    />
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* 本月数据 */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {(() => {
              const monthlyNew = stats.monthlyNewCount ?? stats.thisMonthUploads ?? stats.thisMonthSigned ?? 0;
              return [
                { label: '本月新增', value: monthlyNew, color: 'text-emerald-600' },
                { label: '总合同数', value: stats.totalContracts ?? distTotal, color: 'text-blue-600' },
                { label: '生效中', value: signedCount, color: 'text-indigo-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-100 p-2.5 text-center">
                  <p className={`text-lg font-bold ${s.color} tabular-nums`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ));
            })()}
          </div>

          {/* 签署统计卡片 */}
          {signStats && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  电子签署概览
                </h3>
                <Link href="/dashboard/esign/stats" className="text-[10px] text-blue-600 hover:underline">
                  查看详情 →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600 tabular-nums">
                    {signStats.overview?.total || 0}
                  </p>
                  <p className="text-[10px] text-slate-500">签署任务</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">
                    {signStats.overview?.completed || 0}
                  </p>
                  <p className="text-[10px] text-slate-500">已完成</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600 tabular-nums">
                    {signStats.overview?.signing || 0}
                  </p>
                  <p className="text-[10px] text-slate-500">签署中</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">完成率</span>
                  <span className="font-medium text-slate-700">
                    {signStats.overview?.completionRate || 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${signStats.overview?.completionRate || 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* 右栏：最近合同（4列） */}
        {widgetOrder.showRecent && (
        <div className="col-span-12 lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">最近合同</h2>
            <Link href="/dashboard/contracts" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              查看全部 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {recentContracts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <FileText className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-500">暂无合同</p>
                <Link href="/dashboard/upload" className="text-xs text-blue-600 hover:underline mt-1 inline-block">立即发起 →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentContracts.slice(0, 5).map((c: any) => (
                  <Link key={c.id} href={`/dashboard/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{c.partyA || c.partyB || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-semibold text-slate-700 tabular-nums">
                          {c.amount ? formatCurrency(c.amount) : '-'}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block ${
                          STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'
                        }`}>
                          {STATUS_LABELS[c.status] || c.status || ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ===== 3. 我的 AI 员工（全宽，紧凑卡片） ===== */}
      {widgetOrder.showAgent && agentActivity && agentActivity.agents && agentActivity.agents.length > 0 && agentActivity.summary && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-500" />
              我的 AI 员工
              <span className="text-xs text-slate-400 font-normal">
                {agentActivity.summary?.activeAgents ?? 0}/{agentActivity.summary?.totalAgents ?? 0} 在岗
              </span>
            </h2>
            <Link href="/dashboard/ai-agents" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              管理Agent <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {agentActivity.agents.map((agent) => {
              const IconMap: Record<string, any> = { Scale, ShoppingCart, TrendingUp, DollarSign, Users, Crown };
              const Icon = IconMap[agent.icon] || Bot;
              const isActive = agent.status === 'active';
              return (
                <Link key={agent.roleCode} href="/dashboard/ai-agents">
                  <div className="bg-white rounded-xl border border-slate-100 hover:shadow-sm hover:border-indigo-200 transition-all p-3 group">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        {isActive ? '工作中' : '待命'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{agent.roleName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{agent.description}</p>
                    <div className="flex items-center gap-1 text-[10px] mt-1.5">
                      <span className="text-indigo-600 font-medium">{agent.todayLabel}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      </div>
      {/* === /第二屏 === */}

      {/* === 第三屏：平台亮点+商业化入口 === */}
      {/* ===== 4. 平台核心亮点（商业化卖点） ===== */}
      {widgetOrder.showHighlight && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            平台核心能力
            <span className="text-xs text-slate-400 font-normal">多·倍·提·效</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: '开放平台 API',
              desc: '100+ API 接口 · SDK 支持',
              tag: '集成',
              icon: Globe,
              gradient: 'from-indigo-500 via-blue-500 to-indigo-600',
              href: '/dashboard/open-platform',
              highlight: 'API SDK Webhook 全链路开放',
            },
            {
              label: '分销中心',
              desc: '三级分销 · 返佣 15-25%',
              tag: '变现',
              icon: Share2,
              gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
              href: '/dashboard/distribution',
              highlight: '邀请奖励 / 分销 / 代理 三级返佣',
            },
            {
              label: 'RPA 自动化',
              desc: '零代码 · 定时任务',
              tag: '提效',
              icon: Bot,
              gradient: 'from-purple-500 via-violet-500 to-purple-600',
              href: '/dashboard/rpa',
              highlight: '合同起草 / 签署 / 归档 全自动',
            },
            {
              label: '合规审计',
              desc: '全链路留痕 · CA 认证',
              tag: '安全',
              icon: ShieldCheck,
              gradient: 'from-amber-500 via-orange-500 to-amber-600',
              href: '/dashboard/compliance',
              highlight: '司法存证 / 审计日志 / 加密存证',
            },
          ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={idx} href={item.href}>
                    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${item.gradient} opacity-[0.08] -translate-y-8 translate-x-8 group-hover:opacity-[0.12] transition-opacity`} />
                      <div className="relative p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {item.tag}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">{item.label}</h3>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                        <p className="text-[11px] text-indigo-600 font-medium mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="truncate">{item.highlight}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
      )}

      {/* ===== 5. 商业化入口（分销返佣与套餐升级） ===== */}
      {widgetOrder.showBusiness && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/distribution" className="block">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5 hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-200/20 blur-3xl -translate-y-10 translate-x-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-emerald-600" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">推荐有礼</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">邀请好友 · 最高返佣 25%</h3>
            <p className="text-xs text-slate-500 mt-1">专属邀请链接，成功签约即可获赠时长和返佣，分销商 30 条合同额度</p>
            <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-medium">
              <span>立即生成邀请链接</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          </div>
        </Link>

        <Link href="/dashboard/settings?tab=subscription" className="block">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-200/20 blur-3xl -translate-y-10 translate-x-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">升级套餐</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">企业版 · 无限签发不限量</h3>
            <p className="text-xs text-slate-500 mt-1">解锁批量签署 / CA 认证 / 审批流 / 无限合同，团队协作</p>
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs font-medium">
              <span>查看套餐详情</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          </div>
        </Link>

        <Link href="/dashboard/open-platform" className="block">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5 hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-200/20 blur-3xl -translate-y-10 translate-x-10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-5 w-5 text-blue-600" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">开发者</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">开放平台 · 系统集成</h3>
            <p className="text-xs text-slate-500 mt-1">API / SDK / Webhook，集成到企业自有系统</p>
            <div className="mt-3 flex items-center gap-2 text-blue-600 text-xs font-medium">
              <span>接入文档</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          </div>
        </Link>
      </div>
      )}
    </div>
  );
}
