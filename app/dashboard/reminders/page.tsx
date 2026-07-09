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
import { Bell, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';

const REMINDERS = [
  {
    id: '1',
    contractName: '办公室租赁合同',
    remindAt: '2024-08-15 09:00',
    type: 'expire',
    status: 'pending',
    title: '办公室租赁合同即将到期',
  },
  {
    id: '2',
    contractName: '2024年度采购合同',
    remindAt: '2024-07-01 10:00',
    type: 'review',
    status: 'pending',
    title: '2024年度采购合同半年复核',
  },
  {
    id: '3',
    contractName: '品牌授权协议',
    remindAt: '2024-06-01 09:00',
    type: 'custom',
    status: 'sent',
    title: '品牌授权协议续约提醒',
  },
  {
    id: '4',
    contractName: '技术服务合同',
    remindAt: '2024-05-20 14:00',
    type: 'expire',
    status: 'sent',
    title: '技术服务合同到期提醒',
  },
  {
    id: '5',
    contractName: '员工劳动合同 - 王五',
    remindAt: '2024-03-01 09:00',
    type: 'expire',
    status: 'cancelled',
    title: '王五劳动合同到期提醒',
  },
];

const TYPE_LABELS: Record<string, string> = {
  expire: '到期提醒',
  review: '复核提醒',
  custom: '自定义',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
  pending: { label: '待发送', variant: 'warning' },
  sent: { label: '已发送', variant: 'success' },
  failed: { label: '发送失败', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'secondary' },
};

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">提醒管理</h1>
          <p className="text-muted-foreground mt-1">管理合同到期提醒和待办事项</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建提醒
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>提醒内容</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>提醒时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REMINDERS.map((reminder) => {
                const statusCfg = STATUS_CONFIG[reminder.status] || {
                  label: reminder.status,
                  variant: 'default',
                };
                return (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">{reminder.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {reminder.contractName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {reminder.remindAt}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[reminder.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {reminder.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
