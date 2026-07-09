'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, AlertTriangle, Bell, TrendingUp, ArrowUpRight, Clock, Plus, Sparkles, Crown
} from 'lucide-react';
import { formatDate, formatAmount } from '@/lib/utils';

const STATS_DATA = {
  totalContracts: 128,
  expiringCount: 8,
  thisMonthUploads: 23,
  pendingReminders: 5,
  contractUsage: 8,
  contractLimit: 20,
  memberLevel: 'free' as 'free' | 'pro',
};

const RECENT_CONTRACTS = [
  { id: 'c1', name: '2024年度采购合同', partyA: '上海科技有限公司', amount: 580000, status: 'active' as const, endDate: '2024-12-31' },
  { id: 'c2', name: '办公室租赁合同', partyA: '北京写字楼管理公司', amount: 240000, status: 'expiring' as const, endDate: '2024-08-15' },
  { id: 'c3', name: '软件开发服务协议', partyA: '深圳数码科技有限公司', amount: 150000, status: 'active' as const, endDate: '2025-03-20' },
  { id: 'c4', name: '员工劳动合同 - 张三', partyA: '张三', amount: 0, status: 'active' as const, endDate: '2025-06-01' },
  { id: 'c5', name: '品牌授权协议', partyA: '广州品牌管理有限公司', amount: 300000, status: 'expired' as const, endDate: '2024-01-01' },
];

const UPCOMING_REMINDERS = [
  { id: '1', title: '办公室租赁合同即将到期', contractId: 'c2', date: '2024-08-15', type: 'expire' as const },
  { id: '2', title: '2024年度采购合同半年复核', contractId: 'c1', date: '2024-07-01', type: 'review' as const },
  { id: '3', title: '品牌授权协议续约提醒', contractId: 'c5', date: '2024-06-01', type: 'custom' as const },
];

export default function DashboardPage() {
  const { totalContracts, expiringCount, thisMonthUploads, pendingReminders, contractUsage, contractLimit, memberLevel } = STATS_DATA;
  const usagePercent = Math.min((contractUsage / contractLimit) * 100, 100);
  const isNearLimit = contractUsage >= contractLimit * 0.8;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">概览</h1>
        <p className="text-muted-foreground mt-1">欢迎回来，以下是您的合同数据概览</p>
      </div>

      <Card className={`border-2 ${memberLevel === 'pro' ? 'border-amber-200 bg-amber-50/50' : 'border-muted'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${memberLevel === 'pro' ? 'bg-amber-100' : 'bg-muted'} flex items-center justify-center`}>
              <Crown className={`h-5 w-5 ${memberLevel === 'pro' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{memberLevel === 'pro' ? '年度会员' : '免费版'}</p>
              {memberLevel === 'free' && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isNearLimit ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${usagePercent}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{contractUsage}/{contractLimit}</span>
                </div>
              )}
            </div>
          </div>
          {memberLevel === 'free' && (
            <Link href="/dashboard/settings"><Button size="sm" className="gap-1"><Sparkles className="h-3 w-3" />升级</Button></Link>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: '合同总数', value: totalContracts, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: '即将到期', value: expiringCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
          { title: '本月上传', value: thisMonthUploads, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
          { title: '待处理提醒', value: pendingReminders, icon: Bell, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{stat.title}</p><p className="text-3xl font-bold mt-1">{stat.value}</p></div>
                <div className={`h-12 w-12 rounded-full ${stat.bg} flex items-center justify-center`}><stat.icon className={`h-6 w-6 ${stat.color}`} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>最近合同</CardTitle><CardDescription>点击可查看详情</CardDescription></div>
            <Link href="/dashboard/contracts"><Button variant="ghost" size="sm">查看全部</Button></Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {RECENT_CONTRACTS.map((contract) => (
                <Link key={contract.id} href={`/dashboard/contracts/${contract.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contract.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {contract.partyA}{contract.amount > 0 && ` · ${formatAmount(contract.amount)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={contract.status === 'expired' ? 'destructive' : contract.status === 'expiring' ? 'warning' : 'success'} className="text-xs">
                      {contract.status === 'active' ? '进行中' : contract.status === 'expiring' ? '即将到期' : '已过期'}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>待办提醒</CardTitle><CardDescription>点击跳转到合同详情</CardDescription></div>
            <Link href="/dashboard/reminders"><Button variant="ghost" size="sm">全部</Button></Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {UPCOMING_REMINDERS.map((reminder) => (
                <Link key={reminder.id} href={`/dashboard/contracts/${reminder.contractId}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    reminder.type === 'expire' ? 'bg-amber-500' : reminder.type === 'review' ? 'bg-blue-500' : 'bg-purple-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{reminder.date}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
