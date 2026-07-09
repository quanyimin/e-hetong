'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Gauge,
  Droplets,
  Zap,
  Plus,
  X,
  Search,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

/** 表计类型定义 */
type MeterType = 'water' | 'electricity' | 'gas';

/** 单条表计读数记录 */
interface MeterReading {
  id: string;
  roomName: string;
  meterType: MeterType;
  currentReading: number;
  previousReading: number;
  readingDate: string;
  consumption: number;
  cost: number;
  status: 'normal' | 'high';
}

/** 新增读数的表单数据 */
interface NewReadingForm {
  roomName: string;
  meterType: MeterType | '';
  readingValue: string;
  readingDate: string;
}

/** 表计类型配置 */
const METER_CONFIG: Record<MeterType, { label: string; unit: string; icon: React.ElementType; rate: number; color: string; bg: string }> = {
  water: { label: '水表', unit: 'm³', icon: Droplets, rate: 4.5, color: 'text-blue-600', bg: 'bg-blue-100' },
  electricity: { label: '电表', unit: 'kWh', icon: Zap, rate: 0.8, color: 'text-amber-600', bg: 'bg-amber-100' },
  gas: { label: '燃气表', unit: 'm³', icon: Gauge, rate: 3.2, color: 'text-orange-600', bg: 'bg-orange-100' },
};

/** 可用房间列表 */
const ROOMS = ['A栋101', 'A栋102', 'B栋201', 'B栋202'];

/** 示例表计数据 */
const SAMPLE_READINGS: MeterReading[] = [
  { id: '1', roomName: 'A栋101', meterType: 'electricity', currentReading: 3850, previousReading: 3720, readingDate: '2026-07-08', consumption: 130, cost: 104, status: 'normal' },
  { id: '2', roomName: 'A栋101', meterType: 'water', currentReading: 128, previousReading: 115, readingDate: '2026-07-08', consumption: 13, cost: 58.5, status: 'normal' },
  { id: '3', roomName: 'A栋102', meterType: 'electricity', currentReading: 2100, previousReading: 1980, readingDate: '2026-07-07', consumption: 120, cost: 96, status: 'normal' },
  { id: '4', roomName: 'A栋102', meterType: 'water', currentReading: 95, previousReading: 82, readingDate: '2026-07-07', consumption: 13, cost: 58.5, status: 'normal' },
  { id: '5', roomName: 'B栋201', meterType: 'gas', currentReading: 560, previousReading: 510, readingDate: '2026-07-06', consumption: 50, cost: 160, status: 'high' },
  { id: '6', roomName: 'B栋201', meterType: 'electricity', currentReading: 4200, previousReading: 4010, readingDate: '2026-07-06', consumption: 190, cost: 152, status: 'normal' },
  { id: '7', roomName: 'B栋202', meterType: 'electricity', currentReading: 1870, previousReading: 1760, readingDate: '2026-07-05', consumption: 110, cost: 88, status: 'normal' },
  { id: '8', roomName: 'B栋202', meterType: 'water', currentReading: 72, previousReading: 61, readingDate: '2026-07-05', consumption: 11, cost: 49.5, status: 'normal' },
];

/** 从记录中提取最新一条各表计读数，用于卡片展示 */
function getLatestReadings(readings: MeterReading[]): MeterReading[] {
  const map = new Map<string, MeterReading>();
  for (const r of readings) {
    const key = `${r.roomName}-${r.meterType}`;
    const existing = map.get(key);
    if (!existing || r.readingDate > existing.readingDate) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

/**
 * 水电读数管理页面
 * 用于录入和管理租赁房屋的水电表读数，支持读数录入、费用计算、历史记录查询
 */
export default function MetersPage() {
  const [readings, setReadings] = useState<MeterReading[]>(SAMPLE_READINGS);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<NewReadingForm>({
    roomName: '',
    meterType: '',
    readingValue: '',
    readingDate: new Date().toISOString().slice(0, 10),
  });

  // 最新各表计读数
  const latestReadings = useMemo(() => getLatestReadings(readings), [readings]);

  // 按房间搜索过滤
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return readings;
    const q = searchQuery.trim().toLowerCase();
    return readings.filter((r) => r.roomName.toLowerCase().includes(q));
  }, [readings, searchQuery]);

  // 表单提交：新增读数
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomName || !formData.meterType || !formData.readingValue || !formData.readingDate) return;

    const meterType = formData.meterType as MeterType;
    const config = METER_CONFIG[meterType];
    const currentValue = parseFloat(formData.readingValue);

    // 查找该表计的上一次读数
    const prev = [...readings]
      .filter((r) => r.roomName === formData.roomName && r.meterType === meterType)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0];

    const previousValue = prev?.currentReading ?? 0;
    const consumption = currentValue - previousValue;
    const cost = parseFloat((consumption * config.rate).toFixed(2));
    const status = consumption > 150 ? 'high' : 'normal';

    const newReading: MeterReading = {
      id: Date.now().toString(),
      roomName: formData.roomName,
      meterType,
      currentReading: currentValue,
      previousReading: previousValue,
      readingDate: formData.readingDate,
      consumption,
      cost,
      status,
    };

    setReadings((prev) => [newReading, ...prev]);
    setFormData({ roomName: '', meterType: '', readingValue: '', readingDate: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题与操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">水电读数管理</h1>
          <p className="text-muted-foreground mt-1">录入和管理租赁房屋的水电表读数</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-2" />
              取消
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              新增读数
            </>
          )}
        </Button>
      </div>

      {/* 新增读数表单（内联） */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              录入新读数
            </CardTitle>
            <CardDescription>填写表计读数信息后提交，系统将自动计算用量和费用</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 房间选择 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">房间</label>
                <Select
                  value={formData.roomName}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, roomName: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择房间" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 表计类型选择 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">表计类型</label>
                <Select
                  value={formData.meterType}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, meterType: v as MeterType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METER_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 读数数值 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">当前读数</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="输入表计读数"
                  value={formData.readingValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, readingValue: e.target.value }))}
                />
              </div>

              {/* 读数日期 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">读数日期</label>
                <Input
                  type="date"
                  value={formData.readingDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, readingDate: e.target.value }))}
                />
              </div>

              {/* 提交按钮 */}
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  提交读数
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 表计读数卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {latestReadings.map((reading) => {
          const config = METER_CONFIG[reading.meterType];
          const Icon = config.icon;
          return (
            <Card key={`${reading.roomName}-${reading.meterType}`}>
              <CardContent className="p-6">
                {/* 顶部：房间名 + 状态 */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">{reading.roomName}</p>
                  <Badge variant={reading.status === 'high' ? 'warning' : 'success'}>
                    {reading.status === 'high' ? '用量偏高' : '正常'}
                  </Badge>
                </div>

                {/* 表计类型图标与读数 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-9 w-9 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-xl font-bold">{reading.currentReading}</p>
                  </div>
                </div>

                {/* 用量与费用 */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">上次读数</span>
                    <span>{reading.previousReading} {config.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">本次用量</span>
                    <span className="font-medium">{reading.consumption} {config.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">预估费用</span>
                    <span className="font-semibold text-primary">¥{reading.cost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 汇总统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: '总表计数量',
            value: latestReadings.length,
            icon: Gauge,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
          },
          {
            title: '本月总费用',
            value: `¥${latestReadings.reduce((sum, r) => sum + r.cost, 0).toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-100',
          },
          {
            title: '高用量提醒',
            value: latestReadings.filter((r) => r.status === 'high').length,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 历史读数记录表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              历史读数记录
            </CardTitle>
            <CardDescription>最近的水电燃气表读数录入历史</CardDescription>
          </div>
          <Button variant="ghost" size="sm">查看全部</Button>
        </CardHeader>
        <CardContent>
          {/* 搜索工具栏 */}
          <div className="relative max-w-xs mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索房间名称…"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-base font-medium text-muted-foreground">未找到匹配的记录</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchQuery ? '尝试修改搜索关键词' : '暂无历史读数数据'}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  清除搜索
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                共 {filteredHistory.length} 条记录
                {searchQuery && readings.length !== filteredHistory.length && (
                  <span className="text-muted-foreground/60">（已筛选）</span>
                )}
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>房间</TableHead>
                      <TableHead>表计类型</TableHead>
                      <TableHead>当前读数</TableHead>
                      <TableHead>上次读数</TableHead>
                      <TableHead>用量</TableHead>
                      <TableHead>费用</TableHead>
                      <TableHead>读数日期</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((record) => {
                      const config = METER_CONFIG[record.meterType];
                      const Icon = config.icon;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.roomName}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              {config.label}
                            </span>
                          </TableCell>
                          <TableCell>{record.currentReading}</TableCell>
                          <TableCell>{record.previousReading}</TableCell>
                          <TableCell>
                            {record.consumption} {config.unit}
                          </TableCell>
                          <TableCell className="font-medium">¥{record.cost.toFixed(2)}</TableCell>
                          <TableCell>{record.readingDate}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'high' ? 'warning' : 'success'} className="text-xs">
                              {record.status === 'high' ? (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  偏高
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  正常
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
