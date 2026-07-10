'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, AlertTriangle, ArrowRight, Building2, UtensilsCrossed, Users, DollarSign } from 'lucide-react';

const SCENE_CONFIG: Record<string, { name: string; icon: any; color: string; href: string; quickActions: { label: string; href: string }[] }> = {
  LANDLORD: {
    name: '房东物业',
    icon: Building2,
    color: 'text-blue-600 bg-blue-50',
    href: '/dashboard/landlord',
    quickActions: [
      { label: '水电读数', href: '/dashboard/landlord/meters' },
      { label: '押金管理', href: '/dashboard/landlord/deposit' },
      { label: '设备管理', href: '/dashboard/landlord/devices' },
    ],
  },
  RESTAURANT: {
    name: '餐饮门店',
    icon: UtensilsCrossed,
    color: 'text-orange-600 bg-orange-50',
    href: '/dashboard/restaurant',
    quickActions: [
      { label: '证照管理', href: '/dashboard/restaurant/licenses' },
      { label: '月度计划', href: '/dashboard/restaurant/plan' },
      { label: '供应商管理', href: '/dashboard/partners' },
    ],
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({});
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [billsDue, setBillsDue] = useState<any[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setFetchError(null);
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/contracts?limit=5').then(r => r.json()),
      fetch('/api/bills?status=PENDING').then(r => r.json()),
      fetch('/api/upcoming').then(r => r.json()),
    ]).then(([statsData, contractsData, billsData, upcomingData]) => {
      setStats(statsData.stats || statsData || {});
      setRecentContracts(contractsData.data || contractsData.contracts || []);
      setBillsDue(billsData.bills || []);
      setUpcomingItems(upcomingData.items || []);
    }).catch(e => {
      console.error(e);
      setFetchError('部分数据加载失败');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {fetchError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />{fetchError}
        </div>
      )}

      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">合同总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContracts || 0}</div>
            <p className="text-xs text-muted-foreground">总金额 ¥{(stats.totalAmount || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待收账款</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">¥{(stats.pendingIncome || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingIncomeCount || 0}笔待收</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待付款项</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">¥{(stats.pendingExpense || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingExpenseCount || 0}笔待付</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">即将到期</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expiringCount || 0}</div>
            <p className="text-xs text-muted-foreground">30天内到期</p>
          </CardContent>
        </Card>
      </div>

      {/* 到期日历 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">到期日历</CardTitle></CardHeader>
        <CardContent>
          {upcomingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">近期无到期项目</p>
          ) : (
            <div className="space-y-2">
              {upcomingItems.slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {new Date(item.date).getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Badge variant={item.daysLeft <= 1 ? 'destructive' : item.daysLeft <= 7 ? 'default' : 'outline'}>
                    {item.daysLeft <= 0 ? '已过期' : `${item.daysLeft}天`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 行业插件看板 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">行业插件</h2>
          <Link href="/dashboard/plugins" className="text-sm text-primary flex items-center gap-1">
            探索更多插件 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(SCENE_CONFIG).map(([code, config]) => {
            const Icon = config.icon;
            return (
              <Card key={code} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${config.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{config.name}</h3>
                        <Badge variant="secondary" className="text-xs">已安装</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {config.quickActions.map(action => (
                          <Link key={action.href} href={action.href}>
                            <Button variant="outline" size="sm" className="text-xs">
                              {action.label}
                            </Button>
                          </Link>
                        ))}
                        <Link href={config.href}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            进入 <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 待办账单 */}
      {billsDue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">待办账款</h2>
            <Link href="/dashboard/ledger" className="text-sm text-primary flex items-center gap-1">
              台账详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {billsDue.slice(0, 5).map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium">{bill.title || bill.contract?.name || '账单'}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.dueDate ? `到期: ${new Date(bill.dueDate).toLocaleDateString()}` : ''}
                        {' · '}{bill.type === 'INCOME' ? '应收' : '应付'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">¥{bill.amount.toLocaleString()}</p>
                      <Badge variant={bill.status === 'OVERDUE' ? 'destructive' : 'outline'} className="text-xs">
                        {bill.status === 'OVERDUE' ? '逾期' : '待处理'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 最近合同 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近合同</h2>
          <Link href="/dashboard/contracts" className="text-sm text-primary flex items-center gap-1">
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {recentContracts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无最近合同</p>
                <Button variant="link" size="sm" onClick={() => router.push('/dashboard/contracts')}>
                  去上传合同
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentContracts.slice(0, 5).map((c: any) => (
                  <Link key={c.id} href={`/dashboard/contracts/${c.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.partyA || c.partyB || ''}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-medium">{c.amount ? `¥${c.amount.toLocaleString()}` : '-'}</p>
                        <Badge variant="outline" className="text-xs">{c.status || ''}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
