'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Wallet, FileText, Calendar, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

interface LedgerData {
  summary: { total: number; totalAmount: number };
  monthly: { income: number; expense: number; net: number };
  yearly: { income: number; expense: number; net: number };
  typeDistribution: { type: string; count: number; amount: number }[];
  statusDistribution: { status: string; count: number }[];
  expiring: {
    days7: any[];
    days15: any[];
    days30: any[];
  };
  trend: { month: string; income: number; expense: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  sale: '销售合同',
  lease: '租赁合同',
  labor: '劳动合同',
  service: '服务合同',
  loan: '借款合同',
  nda: '保密协议',
  other: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  SIGNING: '签署中',
  ACTIVE: '生效中',
  CLOSED: '已完结',
  TERMINATED: '已终止',
  ARCHIVED: '已归档',
};

function formatCurrency(n: number) {
  if (n >= 100000000) return `¥${(n / 100000000).toFixed(2)}亿`;
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const end = new Date(dateStr);
  return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export default function LedgerPage() {
  const { user } = useAuth();
  const [data, setData] = React.useState<LedgerData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'month' | 'year'>('month');
  const [expiringTab, setExpiringTab] = React.useState<7 | 15 | 30>(7);

  const loadData = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    fetch('/api/contracts/ledger')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || json.message || '加载失败');
        }
      })
      .catch(e => setError(e.message || '网络错误'))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-32 text-center">
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>重新加载</Button>
      </div>
    );
  }

  if (!data) {
    return <div className="py-32 text-center text-sm text-muted-foreground">暂无数据</div>;
  }

  const current = activeTab === 'month' ? data.monthly : data.yearly;
  const expiringList = expiringTab === 7
    ? data.expiring.days7
    : expiringTab === 15 ? data.expiring.days15 : data.expiring.days30;
  const maxTrendVal = Math.max(...data.trend.flatMap(t => [t.income, t.expense]), 1);

  return (
    <div className="min-h-screen pb-24">
      {/* 页面标题 */}
      <div className="mb-12">
        <h1 className="text-[28px] font-normal tracking-tight text-foreground">合同台账</h1>
        <p className="text-sm text-muted-foreground mt-2">
          共 <span className="text-foreground tabular-nums">{data.summary.total}</span> 份合同 · 总额 <span className="text-foreground tabular-nums">{formatCurrency(data.summary.totalAmount)}</span>
        </p>
      </div>

      {/* 收支概览 */}
      <div className="mb-14">
        <div className="flex items-center gap-1 mb-7">
          <button
            onClick={() => setActiveTab('month')}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'month'
                ? 'text-foreground bg-secondary/80 font-normal'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            本月
          </button>
          <button
            onClick={() => setActiveTab('year')}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'year'
                ? 'text-foreground bg-secondary/80 font-normal'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            本年
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">收入</span>
            </div>
            <p className="text-4xl font-extralight tabular-nums tracking-tight text-emerald-600/90">
              {formatCurrency(current.income)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">支出</span>
            </div>
            <p className="text-4xl font-extralight tabular-nums tracking-tight text-rose-600/90">
              {formatCurrency(current.expense)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">净额</span>
            </div>
            <p className={`text-4xl font-extralight tabular-nums tracking-tight ${
              current.net >= 0 ? 'text-foreground/90' : 'text-rose-600/90'
            }`}>
              {current.net >= 0 ? '' : '-'}
              {formatCurrency(Math.abs(current.net))}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/40 mb-14" />

      {/* 趋势 + 类型分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-14">
        {/* 收支趋势 */}
        <div>
          <h3 className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-7">
            近6个月趋势
          </h3>
          <div className="flex items-end justify-between gap-2 h-40 px-1">
            {data.trend.map((t, i) => {
              const incomeH = Math.max((t.income / maxTrendVal) * 100, 2);
              const expenseH = Math.max((t.expense / maxTrendVal) * 100, 2);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2.5">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div
                      className="w-1.5 bg-emerald-200/70 rounded-sm transition-all hover:bg-emerald-300/80"
                      style={{ height: `${incomeH}%` }}
                      title={`收入 ${formatCurrency(t.income)}`}
                    />
                    <div
                      className="w-1.5 bg-rose-200/70 rounded-sm transition-all hover:bg-rose-300/80"
                      style={{ height: `${expenseH}%` }}
                      title={`支出 ${formatCurrency(t.expense)}`}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 tabular-nums">{t.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-sm bg-emerald-300/80" />
              <span className="text-[11px] text-muted-foreground/70">收入</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-sm bg-rose-300/80" />
              <span className="text-[11px] text-muted-foreground/70">支出</span>
            </div>
          </div>
        </div>

        {/* 合同类型分布 */}
        <div>
          <h3 className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-7">
            类型分布
          </h3>
          {data.typeDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 text-center py-12">暂无数据</p>
          ) : (
            <div className="space-y-5">
              {data.typeDistribution.map((t, i) => {
                const maxCount = Math.max(...data.typeDistribution.map(x => x.count));
                const pct = (t.count / maxCount) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-foreground/70 text-sm">{TYPE_LABELS[t.type] || t.type}</span>
                      <span className="text-muted-foreground/70 tabular-nums text-[11px]">
                        {t.count} 份 · {formatCurrency(t.amount)}
                      </span>
                    </div>
                    <div className="h-0.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/15 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border/40 mb-14" />

      {/* 到期提醒 */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-7">
          <h3 className="text-xs font-normal uppercase tracking-wider text-muted-foreground">
            到期提醒
          </h3>
          <div className="flex items-center gap-0.5">
            {[7, 15, 30].map(d => (
              <button
                key={d}
                onClick={() => setExpiringTab(d as 7 | 15 | 30)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  expiringTab === d
                    ? 'text-foreground bg-secondary/70 font-normal'
                    : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>

        {expiringList.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-7 w-7 text-muted-foreground/15 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-muted-foreground/50">未来 {expiringTab} 日暂无到期合同</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {expiringList.map((c, i) => {
              const days = daysUntil(c.endDate);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/80 truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {c.partyA || '—'}  ·  {c.partyB || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {c.amount && (
                      <div className="text-right">
                        <p className={`text-sm tabular-nums text-foreground/80 ${
                          c.direction === 'INCOME' ? 'text-emerald-600/80' : 'text-rose-600/80'
                        }`}>
                          {c.direction === 'INCOME' ? '+' : '-'}{formatCurrency(c.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 tabular-nums">
                          {formatDate(c.endDate)}
                        </p>
                      </div>
                    )}
                    <div className={`text-[11px] tabular-nums px-2.5 py-1 rounded-sm ${
                      days <= 7
                        ? 'bg-rose-50/80 text-rose-500'
                        : days <= 15
                          ? 'bg-amber-50/80 text-amber-600'
                          : 'bg-secondary/60 text-muted-foreground/70'
                    }`}>
                      {days}天
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-border/40 mb-14" />

      {/* 状态分布 */}
      <div className="mb-8">
        <h3 className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-7">
          状态分布
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.statusDistribution.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/40"
            >
              <span className="text-xs text-muted-foreground/70">
                {STATUS_LABELS[s.status] || s.status}
              </span>
              <span className="text-sm text-foreground/70 tabular-nums font-light">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
