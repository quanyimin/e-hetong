'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Download, Crown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

function BarChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  return (
    <div className="flex items-end gap-3 h-40 pt-4">
      {data.map((item) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '120px' }}>
            <div
              className="w-3 bg-blue-500 rounded-t transition-all"
              style={{ height: `${(item.income / max) * 100}%` }}
              title={`收入: ¥${item.income}`}
            />
            <div
              className="w-3 bg-amber-400 rounded-t transition-all"
              style={{ height: `${(item.expense / max) * 100}%` }}
              title={`支出: ¥${item.expense}`}
            />
          </div>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isEnterprise = tenant?.sceneType === 'ENTERPRISE' || user?.memberLevel === 'enterprise' || user?.memberLevel === 'pro';

  useEffect(() => {
    if (!user || !tenant) return;
    if (!isEnterprise) {
      router.push('/pricing?ref=finance');
      return;
    }
    fetch('/api/finance/stats')
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">暂无财务数据</div>;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50 text-green-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">财务看板</h1>
            <p className="text-sm text-muted-foreground">企业会员专属 · 月度财务概览</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> 导出月报
        </Button>
      </div>

      {/* 企业会员提示 */}
      {!isEnterprise && (
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <p className="text-sm">财务看板为企业会员专属功能</p>
            </div>
            <Button size="sm" onClick={() => router.push('/pricing')}>升级会员</Button>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当月营收</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">¥{data.income.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Number(data.incomeChange) >= 0 ? '比上月+' : '比上月'}{data.incomeChange}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当月支出</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">¥{data.expense.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">本月已支出</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">净利润</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">¥{data.profit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.lastIncome > 0
                ? `同比 +${data.lastIncome > 0 ? ((data.income - data.lastIncome) / data.lastIncome * 100).toFixed(1) : 0}%`
                : '暂无同比数据'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 月度收支趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">月度收支趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={data.monthlyData || []} />
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>收入</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>支出</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近交易记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近交易记录</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentBills && data.recentBills.length > 0 ? (
            <div className="divide-y">
              {data.recentBills.slice(0, 5).map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bill.type === 'INCOME' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {bill.type === 'INCOME' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bill.title || '交易'}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : ''}
                        {' · '}{bill.type === 'INCOME' ? '收入' : '支出'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${bill.type === 'INCOME' ? 'text-green-600' : 'text-amber-600'}`}>
                      {bill.type === 'INCOME' ? '+' : '-'}¥{bill.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">暂无交易记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
