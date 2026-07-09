'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Plus } from 'lucide-react';

export default function PersonalHomePage() {
  const [stats, setStats] = useState({ income: 0, expense: 0, incomeCount: 0, expenseCount: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    // 加载台账统计
    fetch('/api/ledger').then(r => r.json()).then(d => {
      if (d.success) {
        setStats({
          income: d.income?.totalDue || 0,
          expense: d.expense?.totalDue || 0,
          incomeCount: d.income?.count || 0,
          expenseCount: d.expense?.count || 0,
        });
      }
    }).catch(() => {});

    // 加载即将到期
    fetch('/api/reminders?limit=3').then(r => r.json()).then(d => {
      if (d.success) setUpcoming(d.data || []);
    }).catch(() => {});

    // 加载最近合同
    fetch('/api/contracts?limit=5').then(r => r.json()).then(d => {
      if (d.success) setRecent(d.data || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* 收支台账卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-600">本月应收</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">¥{stats.income.toLocaleString()}</p>
            <p className="text-xs text-blue-500 mt-1">{stats.incomeCount}笔待收款</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-600">本月应付</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">¥{stats.expense.toLocaleString()}</p>
            <p className="text-xs text-amber-500 mt-1">{stats.expenseCount}笔待付款</p>
          </CardContent>
        </Card>
      </div>

      {/* 即将到期 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">即将到期</h2>
          <Link href="/dashboard/reminders" className="text-xs text-primary flex items-center gap-1">
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">
            暂无即将到期的提醒
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((item: any) => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${item.urgent ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`h-4 w-4 ${item.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.contractName || ''}</p>
                  </div>
                  <Badge variant={item.urgent ? 'destructive' : 'secondary'} className="shrink-0 text-xs">
                    {item.daysLeft || 0}天后
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 最近合同 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">最近合同</h2>
          <Link href="/dashboard/contracts" className="text-xs text-primary flex items-center gap-1">
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card><CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-sm text-muted-foreground mb-3">还没有合同，上传第一份吧</p>
            <Link href="/dashboard/upload"><Button size="sm"><Plus className="h-4 w-4 mr-1" />上传合同</Button></Link>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {recent.map((c: any) => (
              <Link key={c.id} href={`/dashboard/contracts/${c.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.partyA || c.partyB || ''}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium">{c.amount ? `¥${c.amount.toLocaleString()}` : '-'}</p>
                      <Badge variant="outline" className="text-xs">{c.status || 'DRAFT'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
