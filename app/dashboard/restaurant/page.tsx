'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  UtensilsCrossed,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Plus,
  Download,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface RestaurantStats {
  totalSuppliers: number;
  activeContracts: number;
  expiredContracts: number;
  totalContractAmount: number;
  upcomingPaymentAmount: number;
  upcomingPaymentCount: number;
}

interface SupplierContract {
  id: string;
  name: string;
  supplierName: string;
  supplierPhone: string;
  category: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentCycle: string;
  nextPaymentDate: string | null;
}

interface MonthlyPaymentSummary {
  month: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentCount: number;
  suppliers: { id: string; name: string; amount: number; paid: boolean }[];
}

type StatusTab = 'all' | 'ACTIVE' | 'EXPIRED';

export default function RestaurantPage() {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPaymentSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, contractsRes, planRes] = await Promise.all([
          fetch(`/api/scenes/restaurant/stats?userId=${user?.id}&tenantId=${tenant?.tenantId}`),
          fetch(`/api/scenes/restaurant/contracts?userId=${user?.id}&tenantId=${tenant?.tenantId}&page=1&pageSize=10`),
          fetch(`/api/scenes/restaurant/monthly-plan?userId=${user?.id}&tenantId=${tenant?.tenantId}`),
        ]);

        const statsData = await statsRes.json();
        const contractsData = await contractsRes.json();
        const planData = await planRes.json();

        if (statsData.success) setStats(statsData.data);
        if (contractsData.success) setContracts(contractsData.data);
        if (planData.success) setMonthlyPlan(planData.data);
      } catch (error) {
        console.error('加载数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id, tenant?.tenantId]);

  // 搜索和筛选逻辑
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // 状态筛选
      if (statusTab !== 'all' && contract.status !== statusTab) return false;
      // 关键词搜索（供应商名称或分类）
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          contract.supplierName.toLowerCase().includes(query) ||
          contract.category.toLowerCase().includes(query) ||
          contract.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [contracts, statusTab, searchQuery]);

  // 分类数据统计（用于进度条展示）
  const categoryStats = useMemo(() => {
    const categories = ['蔬菜类', '肉类', '海鲜类', '粮油类', '调料类', '酒水类'];
    const total = contracts.length || 1;
    return categories.map((cat) => ({
      name: cat,
      count: contracts.filter((c) => c.category === cat).length,
      percentage: Math.round((contracts.filter((c) => c.category === cat).length / total) * 100),
    }));
  }, [contracts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">餐饮门店管理</h1>
          <p className="text-muted-foreground mt-1">管理供应商合同和月度货款支付</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            新建供应商合同
          </Button>
        </div>
      </div>

      {/* 统计卡片组 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats && [
          {
            title: '供应商总数',
            value: stats.totalSuppliers,
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            trend: `${stats.activeContracts} 个有效`,
            trendIcon: TrendingUp,
            trendColor: 'text-green-600',
          },
          {
            title: '有效合同',
            value: stats.activeContracts,
            icon: CheckCircle2,
            color: 'text-green-600',
            bg: 'bg-green-100',
            trend: `占比 ${stats.totalSuppliers ? Math.round((stats.activeContracts / stats.totalSuppliers) * 100) : 0}%`,
            trendIcon: ArrowUpRight,
            trendColor: 'text-green-600',
          },
          {
            title: '即将到期',
            value: stats.expiredContracts,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            trend: '需及时续期',
            trendIcon: Clock,
            trendColor: 'text-amber-600',
          },
          {
            title: '下月应付款',
            value: formatAmount(stats.upcomingPaymentAmount),
            icon: DollarSign,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            trend: `${stats.upcomingPaymentCount} 笔待付`,
            trendIcon: Calendar,
            trendColor: 'text-purple-600',
          },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <stat.trendIcon className={`h-3 w-3 ${stat.trendColor}`} />
                    <span className={`text-xs ${stat.trendColor}`}>{stat.trend}</span>
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 中栏：付款计划 + 食材分类统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度付款计划卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {monthlyPlan?.month || '本月'}付款计划
            </CardTitle>
            <CardDescription>预计支付 {monthlyPlan?.paymentCount} 笔货款</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 金额汇总 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/40 text-center">
                  <p className="text-xs text-muted-foreground">应付总额</p>
                  <p className="text-lg font-bold">{formatAmount(monthlyPlan?.totalAmount || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-center">
                  <p className="text-xs text-green-600">已付金额</p>
                  <p className="text-lg font-bold text-green-700">{formatAmount(monthlyPlan?.paidAmount || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 text-center">
                  <p className="text-xs text-amber-600">待付金额</p>
                  <p className="text-lg font-bold text-amber-700">{formatAmount((monthlyPlan?.totalAmount || 0) - (monthlyPlan?.paidAmount || 0))}</p>
                </div>
              </div>

              {/* 付款进度条 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">付款进度</span>
                  <span className="text-sm font-medium">
                    {monthlyPlan?.totalAmount
                      ? Math.round(((monthlyPlan.paidAmount || 0) / monthlyPlan.totalAmount) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${monthlyPlan?.totalAmount ? ((monthlyPlan.paidAmount || 0) / monthlyPlan.totalAmount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 供应商付款明细 */}
              <div className="space-y-2 mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  供应商付款明细
                </p>
                {monthlyPlan?.suppliers && monthlyPlan.suppliers.length > 0 ? (
                  monthlyPlan.suppliers.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            s.paid ? 'bg-green-500' : 'bg-amber-400'
                          }`}
                        />
                        <span className="text-sm truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            s.paid ? 'text-green-600' : 'text-muted-foreground'
                          }`}
                        >
                          {formatAmount(s.amount)}
                        </span>
                        <Badge variant={s.paid ? 'default' : 'secondary'} className="text-[10px] h-5">
                          {s.paid ? '已付' : '待付'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Calendar className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    <p>暂无付款计划数据</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 食材分类统计卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              食材分类统计
            </CardTitle>
            <CardDescription>各品类供应商分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 分类网格 */}
              <div className="grid grid-cols-3 gap-3">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.name}
                    className="p-3 rounded-lg bg-muted/50 text-center hover:bg-muted/70 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{cat.name}</p>
                    <p className="text-2xl font-bold mt-1">
                      {cat.count || <span className="text-muted-foreground/40">-</span>}
                    </p>
                  </div>
                ))}
              </div>

              {/* 分类占比进度条 */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  占比分布
                </p>
                {categoryStats
                  .filter((cat) => cat.count > 0)
                  .slice(0, 6)
                  .map((cat) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cat.name}</span>
                        <span className="text-muted-foreground">{cat.count} 家 · {cat.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor:
                              cat.name === '蔬菜类'
                                ? '#22c55e'
                                : cat.name === '肉类'
                                  ? '#ef4444'
                                  : cat.name === '海鲜类'
                                    ? '#3b82f6'
                                    : cat.name === '粮油类'
                                      ? '#f59e0b'
                                      : cat.name === '调料类'
                                        ? '#a855f7'
                                        : '#ec4899',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                {categoryStats.filter((cat) => cat.count > 0).length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <UtensilsCrossed className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    <p>暂无供应商数据</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 供应商合同列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              供应商合同列表
            </CardTitle>
            <CardDescription>
              {filteredContracts.length > 0
                ? `共 ${filteredContracts.length} 条记录`
                : '食材采购合同明细'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">查看全部</Button>
          </div>
        </CardHeader>

        {/* 搜索和状态筛选栏 */}
        <div className="px-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* 搜索输入框 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索供应商名称或分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 状态筛选标签 */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {[
              { key: 'all' as StatusTab, label: '全部' },
              { key: 'ACTIVE' as StatusTab, label: '进行中' },
              { key: 'EXPIRED' as StatusTab, label: '已终止' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusTab === tab.key
                    ? 'bg-background text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent>
          {/* 列表/空状态 */}
          <div className="space-y-2">
            {filteredContracts.length === 0 ? (
              /* 增强空状态 - 区分无数据和筛选无结果 */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {searchQuery || statusTab !== 'all' ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-lg font-medium text-muted-foreground">未找到匹配的合同</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      尝试修改搜索关键词或筛选条件
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusTab('all');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      清除筛选条件
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">暂无供应商合同</p>
                    <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
                      点击「新建供应商合同」按钮添加第一条合同记录
                    </p>
                    <Button size="sm" className="mt-4">
                      <Plus className="h-4 w-4 mr-1" />
                      新建供应商合同
                    </Button>
                  </>
                )}
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="group flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{contract.category}</Badge>
                      <p className="font-medium truncate">{contract.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.supplierName} · {contract.supplierPhone}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      合同期: {contract.startDate} ~ {contract.endDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatAmount(contract.amount)}/
                        {contract.paymentCycle === 'month' ? '月' : contract.paymentCycle === 'quarter' ? '季度' : '年'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        下次付款: {contract.nextPaymentDate || '-'}
                      </p>
                    </div>
                    <Badge
                      variant={contract.status === 'ACTIVE' ? 'default' : 'destructive'}
                      className="min-w-[4rem] justify-center"
                    >
                      {contract.status === 'ACTIVE' ? '进行中' : '已终止'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
