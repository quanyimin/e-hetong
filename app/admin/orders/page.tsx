'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { formatDate, formatDateTime, formatAmount } from '@/lib/utils';

// ===========================================
// 类型与模拟数据
// ===========================================

interface AdminOrder {
  id: string;
  orderNo: string;
  user: { name: string | null; email: string | null };
  planType: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt: string | null;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  pro_yearly: '年度会员',
  pro_monthly: '专业版月付',
  enterprise_yearly: '企业版年付',
  enterprise_monthly: '企业版月付',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
  pending: { label: '待支付', variant: 'warning' },
  paid: { label: '已支付', variant: 'success' },
  failed: { label: '支付失败', variant: 'destructive' },
  refunded: { label: '已退款', variant: 'secondary' },
};

const MOCK_ORDERS: AdminOrder[] = Array.from({ length: 28 }, (_, i) => ({
  id: `order_${i + 1}`,
  orderNo: `HT202405${String(10001 + i).slice(1)}`,
  user: { name: ['张三', '李四', '王五', '赵六', '陈七'][i % 5], email: `${['z', 'l', 'w', 'z', 'c'][i % 5]}@example.com` },
  planType: 'pro_yearly',
  amount: 99,
  paymentMethod: 'wechat',
  paymentStatus: (['paid', 'paid', 'paid', 'pending', 'paid', 'failed', 'refunded'] as const)[i % 7],
  paidAt: i % 3 !== 0 ? '2024-05-2' + String((i % 9) + 1) + 'T10:30:00.000Z' : null,
  createdAt: `2024-05-${String((i % 28) + 1).padStart(2, '0')}T${String(8 + (i % 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`,
}));

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  const filtered = MOCK_ORDERS.filter((o) => statusFilter === 'all' || o.paymentStatus === statusFilter);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalRevenue = MOCK_ORDERS.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.amount, 0);
  const paidCount = MOCK_ORDERS.filter((o) => o.paymentStatus === 'paid').length;
  const pendingCount = MOCK_ORDERS.filter((o) => o.paymentStatus === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">订单管理</h1>
        <p className="text-muted-foreground text-sm mt-0.5">所有支付订单记录</p>
      </div>

      {/* 营收统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">总营收</p>
                <p className="text-xl font-bold mt-0.5">{formatAmount(totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">总订单数</p>
                <p className="text-xl font-bold mt-0.5">{MOCK_ORDERS.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">支付成功</p>
                <p className="text-xl font-bold mt-0.5">{paidCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">待支付</p>
                <p className="text-xl font-bold mt-0.5">{pendingCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 状态筛选 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'paid', label: '已支付' },
              { value: 'pending', label: '待支付' },
              { value: 'failed', label: '失败' },
              { value: 'refunded', label: '已退款' },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>支付时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    暂无订单记录
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.paymentStatus] || { label: order.paymentStatus, variant: 'default' as const };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {order.orderNo}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{order.user.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">({order.user.email})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {PLAN_LABELS[order.planType] || order.planType}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.paymentMethod === 'wechat' ? '微信支付' : order.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatAmount(order.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.paidAt ? formatDateTime(order.paidAt) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {filtered.length} 条
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
          </Button>
          <span className="text-sm text-muted-foreground self-center">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页 <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
