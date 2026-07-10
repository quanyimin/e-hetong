'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
  ModalClose,
} from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import {
  Bell,
  Plus,
  CheckCircle2,
  XCircle,
  CalendarDays,
  List,
  LayoutGrid,
  AlertTriangle,
  Send,
  Loader2,
  Trash2,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

// ===================== Types =====================
interface Reminder {
  id: string;
  contractId: string;
  contractName: string;
  title: string;
  message: string;
  remindAt: string;
  remindType: string;
  sendStatus: string;
  createdAt: string;
}

interface ReminderStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
  expiringSoon: number;
}

type ViewMode = 'list' | 'week' | 'month';

// ===================== Constants =====================
const TYPE_LABELS: Record<string, string> = {
  CONTRACT_EXPIRE: '到期提醒',
  REVIEW: '复核提醒',
  CUSTOM: '自定义',
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

// ===================== Helpers =====================
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
}

// ===================== Week View =====================
function WeekView({ reminders }: { reminders: Reminder[] }) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getRemindersForDay = (day: Date) =>
    reminders.filter(r => {
      const rd = new Date(r.remindAt);
      return (
        rd.getFullYear() === day.getFullYear() &&
        rd.getMonth() === day.getMonth() &&
        rd.getDate() === day.getDate()
      );
    });

  return (
    <div className="grid grid-cols-7 gap-1">
      {['一', '二', '三', '四', '五', '六', '日'].map(day => (
        <div key={day} className="text-center text-xs text-muted-foreground py-2 font-medium">
          {day}
        </div>
      ))}
      {days.map(day => {
        const dayReminders = getRemindersForDay(day);
        const isToday = day.toDateString() === today.toDateString();
        return (
          <div
            key={day.toISOString()}
            className={cn(
              'border rounded-lg p-2 min-h-[90px] transition-colors',
              isToday && 'border-primary/50 bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-xs font-medium', isToday && 'text-primary')}>
                {day.getDate()}
              </span>
              {dayReminders.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                  {dayReminders.length}
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              {dayReminders.slice(0, 3).map(r => (
                <div key={r.id} className="text-[10px] truncate rounded px-1 py-0.5 bg-muted">
                  {r.title}
                </div>
              ))}
              {dayReminders.length > 3 && (
                <div className="text-[10px] text-muted-foreground text-center">
                  +{dayReminders.length - 3} 更多
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===================== Month View =====================
function MonthView({ reminders }: { reminders: Reminder[] }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const getRemindersForDay = (day: number) =>
    reminders.filter(r => {
      const rd = new Date(r.remindAt);
      return rd.getFullYear() === currentYear && rd.getMonth() === currentMonth && rd.getDate() === day;
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => {
          if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
          else setCurrentMonth(m => m - 1);
        }}>
          &lt;
        </Button>
        <span className="text-sm font-medium">{currentYear}年{currentMonth + 1}月</span>
        <Button variant="outline" size="sm" onClick={() => {
          if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
          else setCurrentMonth(m => m + 1);
        }}>
          &gt;
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground py-2 font-medium">
            {day}
          </div>
        ))}
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1;
          const isInMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday =
            isInMonth &&
            dayNum === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
          const dayReminders = isInMonth ? getRemindersForDay(dayNum) : [];
          return (
            <div
              key={i}
              className={cn(
                'border rounded-lg p-1.5 min-h-[70px] transition-colors',
                isInMonth ? 'bg-background' : 'bg-muted/30',
                isToday && 'border-primary/50 bg-primary/5'
              )}
            >
              {isInMonth && (
                <>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-xs font-medium', isToday && 'text-primary')}>
                      {dayNum}
                    </span>
                    {dayReminders.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                        {dayReminders.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayReminders.slice(0, 2).map(r => (
                      <div key={r.id} className="text-[9px] truncate rounded px-1 py-0.5 bg-muted">
                        {r.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== New Reminder Modal =====================
function NewReminderModal({
  tenantId,
  userId,
  onCreated,
}: {
  tenantId: string;
  userId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [remindType, setRemindType] = useState('custom');
  const [contractId, setContractId] = useState('');

  const reset = () => {
    setTitle('');
    setMessage('');
    setRemindAt('');
    setRemindType('custom');
    setContractId('');
  };

  const handleSubmit = async () => {
    if (!title || !remindAt) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId,
          title,
          message: message || title,
          remindAt: new Date(remindAt).toISOString(),
          remindType,
          contractId: contractId || undefined,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setOpen(false);
        reset();
        onCreated();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建提醒
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>新建提醒</ModalTitle>
          <ModalDescription>创建合同提醒事项</ModalDescription>
        </ModalHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">提醒标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入提醒标题"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">提醒内容</Label>
            <Input
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="输入提醒内容（选填）"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remindAt">提醒时间 *</Label>
            <Input
              id="remindAt"
              type="datetime-local"
              value={remindAt}
              onChange={e => setRemindAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remindType">类型</Label>
            <Select value={remindType} onValueChange={setRemindType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expire">到期提醒</SelectItem>
                <SelectItem value="review">复核提醒</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contractId">关联合同ID（选填）</Label>
            <Input
              id="contractId"
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              placeholder="输入合同ID"
            />
          </div>
        </div>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline">取消</Button>
          </ModalClose>
          <Button onClick={handleSubmit} loading={loading}>
            创建
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ===================== Main Page =====================
export default function RemindersPage() {
  const { user, tenant } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ReminderStats>({
    pending: 0,
    sent: 0,
    failed: 0,
    total: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const tenantId = tenant?.tenantId || '';

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId, page: '1', pageSize: '100' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/reminders?${params.toString()}`),
        fetch(`/api/reminders/stats?tenantId=${tenantId}`),
      ]);

      const listData = await listRes.json();
      const statsData = await statsRes.json();

      if (listData.code === 0) {
        setReminders(listData.data.list || []);
      }
      if (statsData.code === 0) {
        const s = statsData.data;
        const expiringSoon = (listData.data.list || []).filter(
          (r: Reminder) => r.sendStatus === 'pending' && isWithinDays(r.remindAt, 7)
        ).length;
        setStats({ ...s, expiringSoon });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [tenantId, typeFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (id: string, sendStatus: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendStatus }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('确认删除该提醒？')) return;
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const statCards = [
    { label: '待发送', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: '已发送', value: stats.sent, icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '即将到期（7天）', value: stats.expiringSoon, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '总计', value: stats.total, icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">提醒管理</h1>
          <p className="text-muted-foreground mt-1">请先选择一个主体（租户）</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">提醒管理</h1>
          <p className="text-muted-foreground mt-1">管理合同到期提醒和待办事项</p>
        </div>
        <NewReminderModal tenantId={tenantId} userId={user?.id || ''} onCreated={fetchData} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1" />
            列表
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            周
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            月
          </Button>
        </div>

        {viewMode === 'list' && (
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="类型筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="expire">到期提醒</SelectItem>
                <SelectItem value="review">复核提醒</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待发送</SelectItem>
                <SelectItem value="sent">已发送</SelectItem>
                <SelectItem value="failed">发送失败</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'week' ? (
        <Card>
          <CardContent className="p-4">
            <WeekView reminders={reminders} />
          </CardContent>
        </Card>
      ) : viewMode === 'month' ? (
        <Card>
          <CardContent className="p-4">
            <MonthView reminders={reminders} />
          </CardContent>
        </Card>
      ) : (
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
                {reminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无提醒数据
                    </TableCell>
                  </TableRow>
                ) : (
                  reminders.map(reminder => (
                    <TableRow key={reminder.id}>
                      <TableCell className="font-medium">{reminder.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {reminder.contractName || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(reminder.remindAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TYPE_LABELS[reminder.remindType] || reminder.remindType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[reminder.sendStatus]?.variant || 'default'}>
                          {STATUS_CONFIG[reminder.sendStatus]?.label || reminder.sendStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {reminder.sendStatus === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateStatus(reminder.id, 'sent')}
                                title="标记为已发送"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateStatus(reminder.id, 'cancelled')}
                                title="取消提醒"
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteReminder(reminder.id)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
