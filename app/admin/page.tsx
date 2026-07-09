'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  UserPlus,
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';

// ===========================================
// 模拟数据（TODO: 替换为真实 API 调用）
// ===========================================

interface AdminStats {
  totalUsers: number;
  todayNewUsers: number;
  totalContracts: number;
  monthlyRevenue: number;
  expiringContracts: number;
  paidUsers: number;
  totalOrders: number;
  pendingRefunds: number;
}

const MOCK_STATS: AdminStats = {
  totalUsers: 1286,
  todayNewUsers: 12,
  totalContracts: 3521,
  monthlyRevenue: 28360,
  expiringContracts: 38,
  paidUsers: 362,
  totalOrders: 489,
  pendingRefunds: 3,
};

const RECENT_USERS = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', date: '2024-05-20 14:32', level: 'pro', status: 'active' },
  { id: '2', name: '李四', email: 'lisi@example.com', date: '2024-05-20 11:15', level: 'free', status: 'active' },
  { id: '3', name: '王五', email: 'wangwu@example.com', date: '2024-05-19 16:48', level: 'free', status: 'active' },
  { id: '4', name: '赵六', email: 'zhaoliu@example.com', date: '2024-05-19 09:22', level: 'pro', status: 'active' },
  { id: '5', name: '陈七', email: 'chenqi@example.com', date: '2024-05-18 20:01', level: 'free', status: 'inactive' },
];

const RECENT_ORDERS = [
  { id: '1', orderNo: 'HT20240520001', user: '李四', amount: 99, status: 'paid', date: '2024-05-20 14:35' },
  { id: '2', orderNo: 'HT20240519002', user: '赵六', amount: 99, status: 'paid', date: '2024-05-19 09:25' },
  { id: '3', orderNo: 'HT20240518003', user: '王五', amount: 99, status: 'pending', date: '2024-05-18 10:10' },
  { id: '4', orderNo: 'HT20240517004', user: '张三', amount: 99, status: 'paid', date: '2024-05-17 15:42' },
  { id: '5', orderNo: 'HT20240516005', user: '陈七', amount: 99, status: 'failed', date: '2024-05-16 08:30' },
];

type StatusType = 'up' | 'down';

const STAT_CARDS = [
  {
    title: '注册用户',
    value: MOCK_STATS.totalUsers.toLocaleString(),
    sub: `今日 +${MOCK_STATS.todayNewUsers}`,
    trend: 'up' as StatusType,
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    title: '合同总数',
    value: MOCK_STATS.totalContracts.toLocaleString(),
    sub: `即将到期 ${MOCK_STATS.expiringContracts} 份`,
    trend: 'up' as StatusType,
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    title: '付费用户',
    value: MOCK_STATS.paidUsers.toLocaleString(),
    sub: `付费率 ${(MOCK_STATS.paidUsers / MOCK_STATS.totalUsers * 100).toFixed(1)}%`,
    trend: 'up' as StatusType,
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    title: '本月营收',
    value: formatAmount(MOCK_STATS.monthlyRevenue),
    sub: `订单 ${MOCK_STATS.totalOrders} 笔`,
    trend: 'up' as StatusType,
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">管理总览</h1>
          <p className="text-muted-foreground text-sm mt-0.5">系统整体运营数据概览</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>实时数据（每5分钟更新）</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div className={`h-12 w-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 预警提示 */}
      {MOCK_STATS.pendingRefunds > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">待处理退款：{MOCK_STATS.pendingRefunds} 笔</span>
              <span className="text-muted-foreground ml-2">请及时处理退款申请</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近注册用户 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">最近注册用户</CardTitle>
              <CardDescription>按注册时间倒序</CardDescription>
            </div>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {RECENT_USERS.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.level === 'pro' ? 'default' : 'secondary'} className="text-xs">
                      {user.level === 'pro' ? '年度会员' : '免费版'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{user.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近订单 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">最近支付订单</CardTitle>
              <CardDescription>按支付时间倒序</CardDescription>
            </div>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {RECENT_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{order.orderNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.user} · {order.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatAmount(order.amount)}</span>
                    <Badge
                      variant={
                        order.status === 'paid'
                          ? 'success'
                          : order.status === 'pending'
                          ? 'warning'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {order.status === 'paid' ? '已支付' : order.status === 'pending' ? '待支付' : '失败'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
