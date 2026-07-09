'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, Search, Inbox } from 'lucide-react';

interface BillItem {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  lateFee: number | null;
}

interface ContractLedger {
  id: string;
  name: string;
  financialType: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  partnerName: string;
  bills: BillItem[];
}

interface MonthlyLedger {
  month: string;
  incomeAmount: number;
  expenseAmount: number;
  incomePaid: number;
  expensePaid: number;
  incomePending: number;
  expensePending: number;
  contractCount: number;
}

interface LedgerData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    paidIncome: number;
    paidExpense: number;
    pendingIncome: number;
    pendingExpense: number;
  };
  monthly: MonthlyLedger[];
  contracts: ContractLedger[];
}

const STATUS_BADGE: Record<string, { label: string; color: string; icon: any }> = {
  PAID: { label: '已付', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  PENDING: { label: '待付', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  OVERDUE: { label: '逾期', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
};

function formatMoney(val: number) {
  return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LedgerPage() {
  const { tenant } = useAuth();
  const [data, setData] = React.useState<LedgerData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [viewType, setViewType] = React.useState<'all' | 'income' | 'expense'>('all');
  const [expandedContracts, setExpandedContracts] = React.useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  React.useEffect(() => {
    if (!tenant?.tenantId) return;
    setLoading(true);
    const ft = viewType === 'all' ? '' : viewType;
    fetch(`/api/ledger?tenantId=${tenant.tenantId}&financialType=${ft}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 0) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [tenant?.tenantId, viewType]);

  // 本地过滤：按合同名称搜索 + 按账单状态筛选
  const filteredContracts = React.useMemo(() => {
    if (!data) return [];
    let contracts = data.contracts;

    // 按合同名称搜索
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      contracts = contracts.filter((c) => c.name.toLowerCase().includes(q));
    }

    // 按账单状态筛选
    if (statusFilter !== 'all') {
      contracts = contracts
        .map((c) => ({
          ...c,
          bills: c.bills.filter((b) => b.status === statusFilter),
        }))
        .filter((c) => c.bills.length > 0);
    }

    return contracts;
  }, [data, searchQuery, statusFilter]);

  // 基于过滤后的数据重新计算汇总统计
  const filteredSummary = React.useMemo(() => {
    let totalIncome = 0, totalExpense = 0;
    let paidIncome = 0, paidExpense = 0;

    for (const c of filteredContracts) {
      for (const b of c.bills) {
        if (c.financialType === 'INCOME') {
          totalIncome += b.amount;
          paidIncome += b.paidAmount;
        } else {
          totalExpense += b.amount;
          paidExpense += b.paidAmount;
        }
      }
    }

    return {
      totalIncome,
      totalExpense,
      paidIncome,
      paidExpense,
      pendingIncome: totalIncome - paidIncome,
      pendingExpense: totalExpense - paidExpense,
    };
  }, [filteredContracts]);

  const toggleContract = (id: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

  // 筛选该月对应的合同（基于过滤后的合同数据）
  const getContractsForMonth = (month: string) => {
    if (!data) return [];
    return filteredContracts.filter((c) =>
      c.bills.some((b) => b.dueDate.startsWith(month))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Inbox className="h-16 w-16 mb-4 text-muted-foreground/40" />
        <p className="text-lg font-medium">暂无台账数据</p>
        <p className="text-sm mt-1">当前没有合同台账记录，创建合同后将自动汇总</p>
      </div>
    );
  }

  const hasFilters = searchQuery.trim() !== '' || statusFilter !== 'all';
  const summary = hasFilters ? filteredSummary : data.summary;

  return (
    <div className="space-y-6">
      {/* 页面标题与视图切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">财务管理台账</h1>
          <p className="text-sm text-muted-foreground mt-1">
            自动汇总营收合同与支付合同的应收/应付数据
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setViewType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewType === t
                  ? t === 'income'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : t === 'expense'
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-primary/10 text-primary border-2 border-primary/30'
                  : 'bg-muted text-muted-foreground border-2 border-transparent hover:bg-accent'
              }`}
            >
              {t === 'all' ? '全部台账' : t === 'income' ? '应收台账' : '应付台账'}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索与筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索合同名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        >
          <option value="all">全部状态</option>
          <option value="PAID">已付</option>
          <option value="PENDING">待付</option>
          <option value="OVERDUE">逾期</option>
        </select>
      </div>

      {/* 汇总统计卡片（筛选后自动重算） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 应收汇总 */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">应收汇总（营收合同）</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{formatMoney(summary.totalIncome)}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>已收</span>
              </div>
              <span className="font-semibold">{formatMoney(summary.paidIncome)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-3.5 w-3.5" />
                <span>未收</span>
              </div>
              <span className="font-semibold">{formatMoney(summary.pendingIncome)}</span>
            </div>
          </div>
          {/* 进度条 */}
          {summary.totalIncome > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (summary.paidIncome / summary.totalIncome) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* 应付汇总 */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100">
              <CreditCard className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">应付汇总（支付合同）</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{formatMoney(summary.totalExpense)}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>已付</span>
              </div>
              <span className="font-semibold">{formatMoney(summary.paidExpense)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-3.5 w-3.5" />
                <span>未付</span>
              </div>
              <span className="font-semibold">{formatMoney(summary.pendingExpense)}</span>
            </div>
          </div>
          {/* 进度条 */}
          {summary.totalExpense > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (summary.paidExpense / summary.totalExpense) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* 净额汇总 */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${summary.totalIncome - summary.totalExpense >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              {summary.totalIncome - summary.totalExpense >= 0
                ? <ArrowUpRight className="h-5 w-5 text-blue-600" />
                : <ArrowDownRight className="h-5 w-5 text-red-600" />
              }
            </div>
            <span className="text-sm font-medium text-muted-foreground">收支净额</span>
          </div>
          <div className={`text-2xl font-bold ${summary.totalIncome - summary.totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatMoney(summary.totalIncome - summary.totalExpense)}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">营收总额</span>
              <span className="font-semibold text-green-600">{formatMoney(summary.totalIncome)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">支付总额</span>
              <span className="font-semibold text-orange-600">{formatMoney(summary.totalExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 月度台账明细 */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">月度台账明细</h2>
        </div>
        {data.monthly.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">暂无月度数据</div>
        ) : (
          <div className="divide-y">
            {data.monthly.map((m) => {
              const monthContracts = getContractsForMonth(m.month);
              const isMonthExpanded = expandedMonths.has(m.month);
              return (
                <div key={m.month}>
                  {/* 月份行 */}
                  <button
                    onClick={() => toggleMonth(m.month)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    {isMonthExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="font-medium min-w-[100px]">{m.month}</span>
                    <span className="text-xs text-muted-foreground">{m.contractCount} 份合同</span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-6 text-sm">
                      {viewType !== 'expense' && (
                        <>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">应收</div>
                            <div className="text-green-600 font-medium">{formatMoney(m.incomeAmount)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">实收</div>
                            <div className="font-medium">{formatMoney(m.incomePaid)}</div>
                          </div>
                        </>
                      )}
                      {viewType !== 'income' && (
                        <>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">应付</div>
                            <div className="text-orange-600 font-medium">{formatMoney(m.expenseAmount)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">实付</div>
                            <div className="font-medium">{formatMoney(m.expensePaid)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </button>

                  {/* 月份展开 - 合同列表 */}
                  {isMonthExpanded && (
                    <div className="border-t bg-muted/20">
                      {monthContracts.length === 0 ? (
                        <div className="px-5 py-3 text-sm text-muted-foreground">该月无关联合同</div>
                      ) : (
                        monthContracts.map((c) => {
                          const monthBills = c.bills.filter((b) => b.dueDate.startsWith(m.month));
                          return (
                            <div key={c.id}>
                              <button
                                onClick={() => toggleContract(c.id)}
                                className="w-full flex items-center gap-3 px-8 py-3 hover:bg-muted/50 transition-colors text-left"
                              >
                                {expandedContracts.has(c.id) ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  c.financialType === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {c.financialType === 'INCOME' ? '营收' : '支付'}
                                </span>
                                <span className="text-sm font-medium">{c.name}</span>
                                <span className="text-xs text-muted-foreground">{c.partnerName}</span>
                                <div className="flex-1" />
                                <span className="text-sm font-medium">{formatMoney(monthBills.reduce((s, b) => s + b.amount, 0))}</span>
                              </button>

                              {/* 合同展开 - 账单明细 */}
                              {expandedContracts.has(c.id) && (
                                <div className="border-t bg-background">
                                  {monthBills.map((b) => {
                                    const badge = STATUS_BADGE[b.status] || STATUS_BADGE.PENDING;
                                    return (
                                      <div key={b.id} className="flex items-center gap-3 px-12 py-2.5 text-sm hover:bg-muted/30">
                                        <span className="text-muted-foreground min-w-[120px]">{b.title}</span>
                                        <span className="font-medium">{formatMoney(b.amount)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}>
                                          <badge.icon className="h-3 w-3" />
                                          {badge.label}
                                        </span>
                                        {b.status === 'OVERDUE' && b.lateFee && (
                                          <span className="text-xs text-red-500">滞纳金: {formatMoney(b.lateFee)}</span>
                                        )}
                                        <div className="flex-1" />
                                        <span className="text-xs text-muted-foreground">到期 {b.dueDate}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 备注 */}
      <div className="text-xs text-muted-foreground px-1">
        * 台账数据根据合同关联的账单自动汇总生成。营收合同（INCOME）计入应收，支付合同（EXPENSE）计入应付。
      </div>
    </div>
  );
}
