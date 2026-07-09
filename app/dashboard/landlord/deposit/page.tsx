'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  Lock,
  History,
  Plus,
  Search,
  Filter,
  Receipt,
} from 'lucide-react';
import { formatAmount, formatDate } from '@/lib/utils';

/**
 * 押金管理页面
 * 管理租赁房屋的押金收取、退还记录，支持按租客搜索与状态筛选
 */

/** 押金状态枚举 */
type DepositStatus = 'ACTIVE' | 'REFUNDED' | 'PENDING';

/** 押金记录接口 */
interface DepositRecord {
  id: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  holdingSince: string;
  status: DepositStatus;
}

/** 押金状态展示配置 */
const STATUS_CONFIG: Record<DepositStatus, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  ACTIVE: { label: '在押中', variant: 'default' },
  REFUNDED: { label: '已退还', variant: 'success' },
  PENDING: { label: '待处理', variant: 'warning' },
};

/** 模拟押金台账数据 */
const MOCK_DEPOSITS: DepositRecord[] = [
  { id: 'DEP001', tenantName: '张伟', propertyName: '朝阳区望京花园2栋1单元501', amount: 8000, holdingSince: '2024-03-15', status: 'ACTIVE' },
  { id: 'DEP002', tenantName: '李娜', propertyName: '海淀区中关村小区3号楼2单元302', amount: 6000, holdingSince: '2024-06-01', status: 'ACTIVE' },
  { id: 'DEP003', tenantName: '王强', propertyName: '西城区金融街公寓A座1506', amount: 12000, holdingSince: '2023-09-20', status: 'REFUNDED' },
  { id: 'DEP004', tenantName: '赵敏', propertyName: '东城区安定门胡同12号', amount: 5000, holdingSince: '2024-08-10', status: 'PENDING' },
  { id: 'DEP005', tenantName: '孙磊', propertyName: '丰台区科技园公寓5栋909', amount: 7500, holdingSince: '2023-12-01', status: 'REFUNDED' },
  { id: 'DEP006', tenantName: '周婷', propertyName: '通州区万达广场SOHO 3-2201', amount: 10000, holdingSince: '2024-10-20', status: 'ACTIVE' },
];

/** 根据模拟数据计算的统计值 */
const MOCK_STATS = {
  totalAmount: MOCK_DEPOSITS.reduce((sum, d) => sum + d.amount, 0),
  refundedAmount: MOCK_DEPOSITS.filter((d) => d.status === 'REFUNDED').reduce((sum, d) => sum + d.amount, 0),
  activeCount: MOCK_DEPOSITS.filter((d) => d.status === 'ACTIVE').length,
  pendingCount: MOCK_DEPOSITS.filter((d) => d.status === 'PENDING').length,
};

export default function DepositPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // 客户端搜索筛选
  const filteredDeposits = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_DEPOSITS;
    const q = searchQuery.trim().toLowerCase();
    return MOCK_DEPOSITS.filter(
      (deposit) =>
        deposit.tenantName.toLowerCase().includes(q) ||
        deposit.propertyName.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* 页面标题与操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">押金管理</h1>
          <p className="text-muted-foreground mt-1">管理租赁房屋的押金收退记录</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索租客姓名或房源…"
              className="pl-8 w-56"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            录入押金
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: '押金总额',
            value: formatAmount(MOCK_STATS.totalAmount),
            icon: DollarSign,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            description: '累计收取押金',
          },
          {
            title: '已退还',
            value: formatAmount(MOCK_STATS.refundedAmount),
            icon: ArrowUpRight,
            color: 'text-green-600',
            bg: 'bg-green-100',
            description: '已完成退还',
          },
          {
            title: '在押中',
            value: `${MOCK_STATS.activeCount} 笔`,
            icon: Lock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            description: '当前在押笔数',
          },
          {
            title: '待处理',
            value: `${MOCK_STATS.pendingCount} 笔`,
            icon: History,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            description: '待退还 / 待确认',
          },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{stat.description}</p>
                </div>
                <div className={`h-10 w-10 rounded-full ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 押金台账表格 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              押金台账
            </CardTitle>
            <CardDescription>逐笔记录，清晰可追溯</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-base font-medium text-muted-foreground">未找到匹配的押金记录</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchQuery ? '尝试修改搜索关键词' : '暂无押金数据'}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  清除搜索条件
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* 结果计数 */}
              <p className="text-xs text-muted-foreground mb-3">
                共 {filteredDeposits.length} 条记录
                {searchQuery && MOCK_DEPOSITS.length !== filteredDeposits.length && (
                  <span className="text-muted-foreground/60">（已筛选）</span>
                )}
              </p>
              {/* 表头 - 桌面端可见 */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded-t-lg border-b">
                <div className="col-span-3">租客姓名</div>
                <div className="col-span-4">房源地址</div>
                <div className="col-span-1 text-right">押金金额</div>
                <div className="col-span-2 text-center">起押日期</div>
                <div className="col-span-1 text-center">状态</div>
                <div className="col-span-1 text-center">操作</div>
              </div>
              {/* 数据行 */}
              <div className="divide-y">
                {filteredDeposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 md:py-3 items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* 租客姓名 */}
                    <div className="md:col-span-3">
                      <p className="font-medium text-sm">{deposit.tenantName}</p>
                      <p className="text-xs text-muted-foreground md:hidden mt-1">{deposit.propertyName}</p>
                    </div>
                    {/* 房源地址 - 桌面端 */}
                    <div className="hidden md:block md:col-span-4">
                      <p className="text-sm text-muted-foreground truncate" title={deposit.propertyName}>
                        {deposit.propertyName}
                      </p>
                    </div>
                    {/* 押金金额 */}
                    <div className="md:col-span-1 md:text-right">
                      <p className="text-sm font-semibold">{formatAmount(deposit.amount)}</p>
                    </div>
                    {/* 起押日期 */}
                    <div className="md:col-span-2 md:text-center">
                      <p className="text-sm text-muted-foreground">{formatDate(deposit.holdingSince)}</p>
                    </div>
                    {/* 状态 */}
                    <div className="md:col-span-1 md:text-center">
                      <Badge variant={STATUS_CONFIG[deposit.status].variant} className="text-xs">
                        {STATUS_CONFIG[deposit.status].label}
                      </Badge>
                    </div>
                    {/* 操作按钮 */}
                    <div className="md:col-span-1 md:text-center">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        查看
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 功能预告卡片（降级为次要展示） */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            更多功能开发中
            <Badge variant="secondary" className="ml-1 text-xs">即将上线</Badge>
          </CardTitle>
          <CardDescription>
            押金管理模块后续将支持以下能力
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Landmark, label: '押金台账', desc: '逐笔记录，清晰可追溯' },
              { icon: ArrowDownLeft, label: '押金收取', desc: '支持多方式入账' },
              { icon: ArrowUpRight, label: '押金退还', desc: '自动核算扣除项' },
            ].map((feature) => (
              <div key={feature.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <feature.icon className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{feature.label}</p>
                  <p className="text-xs text-muted-foreground/50">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
