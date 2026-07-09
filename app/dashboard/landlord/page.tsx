'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  Landmark,
  Receipt,
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface RentStats {
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  currentMonthAmount: number;
  currentMonthPaid: number;
  currentMonthCount: number;
  collectionRate: number;
}

interface RentBill {
  id: string;
  contractName: string;
  partnerName: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: string;
  lateFee: number | null;
}

/** 账单状态标签映射 */
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'PENDING', label: '待支付' },
  { key: 'OVERDUE', label: '逾期' },
  { key: 'PAID', label: '已付清' },
] as const;

type TabKey = (typeof STATUS_TABS)[number]['key'];

export default function LandlordPage() {
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RentStats | null>(null);
  const [bills, setBills] = useState<RentBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, billsRes] = await Promise.all([
          fetch(`/api/scenes/landlord/stats?userId=${user?.id}&tenantId=${tenant?.tenantId}`),
          fetch(`/api/scenes/landlord/bills?userId=${user?.id}&tenantId=${tenant?.tenantId}&page=1&pageSize=10`),
        ]);

        const statsData = await statsRes.json();
        const billsData = await billsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (billsData.success) setBills(billsData.data);
      } catch (error) {
        console.error('加载数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id, tenant?.tenantId]);

  // 客户端筛选：根据搜索关键词和状态标签过滤账单列表
  const filteredBills = useMemo(() => {
    let list = bills;

    // 状态筛选
    if (activeTab !== 'all') {
      list = list.filter((bill) => bill.status === activeTab);
    }

    // 关键词搜索
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (bill) =>
          bill.contractName.toLowerCase().includes(q) ||
          bill.partnerName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [bills, activeTab, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">房东收租管理</h1>
          <p className="text-muted-foreground mt-1">管理您的房产租赁合同和租金收款</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            生成账单
          </Button>
        </div>
      </div>

      {/* 汇总统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats &&
          [
            { title: '总租金', value: formatAmount(stats.totalAmount), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', progress: 100 },
            { title: '已收款', value: formatAmount(stats.paidAmount), icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', progress: stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0 },
            { title: '待收款', value: formatAmount(stats.totalAmount - stats.paidAmount), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', progress: stats.totalAmount > 0 ? ((stats.totalAmount - stats.paidAmount) / stats.totalAmount) * 100 : 0 },
            { title: '回款率', value: `${stats.collectionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100', progress: stats.collectionRate },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                {/* 进度条：直观展示各指标占比 */}
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      stat.title === '总租金'
                        ? 'bg-green-500'
                        : stat.title === '已收款'
                          ? 'bg-blue-500'
                          : stat.title === '待收款'
                            ? 'bg-amber-500'
                            : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(stat.progress, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* 本月收款计划 & 逾期提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              本月收款计划
            </CardTitle>
            <CardDescription>预计收款 {stats?.currentMonthCount} 笔</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">应收总额</span>
                <span className="font-semibold">{formatAmount(stats?.currentMonthAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">已收金额</span>
                <span className="font-semibold text-green-600">{formatAmount(stats?.currentMonthPaid || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">待收金额</span>
                <span className="font-semibold text-amber-600">{formatAmount((stats?.currentMonthAmount || 0) - (stats?.currentMonthPaid || 0))}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${stats?.currentMonthAmount ? ((stats.currentMonthPaid || 0) / stats.currentMonthAmount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              逾期提醒
            </CardTitle>
            <CardDescription>{stats?.overdueBills} 笔租金逾期</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {stats && stats.overdueBills === 0 ? (
                <div className="text-green-600">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  <p>暂无逾期租金</p>
                </div>
              ) : stats ? (
                <div className="text-amber-600">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                  <p>有 {stats.overdueBills} 笔租金逾期</p>
                  <p className="text-sm text-muted-foreground">请及时催收</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 租金账单列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              租金账单列表
            </CardTitle>
            <CardDescription>近期租金收款明细</CardDescription>
          </div>
          <Button variant="ghost" size="sm">查看全部</Button>
        </CardHeader>
        <CardContent>
          {/* 搜索与筛选工具栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索合同名称或合作方…"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* 状态标签切换 */}
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {stats && tab.key !== 'all' && (
                      <span className="ml-1 text-xs opacity-70">
                        ({tab.key === 'PENDING' ? stats.pendingBills : tab.key === 'OVERDUE' ? stats.overdueBills : stats.paidBills})
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 账单列表或空状态 */}
          <div className="space-y-2">
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {searchQuery || activeTab !== 'all' ? (
                  <>
                    <Filter className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-base font-medium text-muted-foreground">未找到匹配的账单</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      {searchQuery ? '尝试修改搜索关键词' : '当前筛选条件下暂无数据'}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveTab('all');
                      }}
                    >
                      清除筛选条件
                    </Button>
                  </>
                ) : (
                  <>
                    <Landmark className="h-14 w-14 text-muted-foreground/30 mb-3" />
                    <p className="text-base font-medium text-muted-foreground">暂无租金账单</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      您还没有关联的租金账单，点击上方「生成账单」开始管理
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* 筛选结果计数 */}
                <p className="text-xs text-muted-foreground px-1">
                  共 {filteredBills.length} 条记录
                  {(searchQuery || activeTab !== 'all') && bills.length !== filteredBills.length && (
                    <span className="text-muted-foreground/60">（已筛选）</span>
                  )}
                </p>
                {filteredBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{bill.contractName}</p>
                      <p className="text-sm text-muted-foreground">{bill.partnerName}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(bill.amount)}</p>
                        <p className="text-xs text-muted-foreground">到期: {bill.dueDate}</p>
                      </div>
                      <Badge variant={bill.status === 'PAID' ? 'default' : bill.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                        {bill.status === 'PAID' ? '已付清' : bill.status === 'PARTIAL' ? '部分支付' : '待支付'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
