'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  CheckSquare,
  X,
  ListChecks,
  Receipt,
  Calendar,
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';

/**
 * 月度计划页面
 * 用于制定和管理餐饮门店的月度经营计划，后续将实现营收目标、成本预算、经营分析等功能
 * v2 - 增强版：支持付款项勾选完成、新增付款、日历交互、完成进度统计
 */

const currentMonth = '2026年7月';

// 付款项数据模型
interface PaymentItem {
  id: string;
  supplierName: string;
  amount: number;
  dueDate: number; // 当月第几天，1-31
  completed: boolean;
}

// 月度概览模拟数据
const monthlyOverview = {
  revenue: 186500,
  revenueTarget: 200000,
  cost: 128300,
  costBudget: 140000,
  profit: 58200,
  profitTarget: 60000,
};

// 初始付款项数据
const initialPayments: PaymentItem[] = [
  { id: 'p1', supplierName: '利民蔬菜批发', amount: 18500, dueDate: 10, completed: false },
  { id: 'p2', supplierName: '鲜源肉业', amount: 32000, dueDate: 10, completed: false },
  { id: 'p3', supplierName: '海味鲜水产', amount: 15000, dueDate: 15, completed: false },
  { id: 'p4', supplierName: '金龙粮油', amount: 12000, dueDate: 20, completed: false },
  { id: 'p5', supplierName: '川香调味品', amount: 6800, dueDate: 20, completed: false },
  { id: 'p6', supplierName: '鼎丰酒水', amount: 9600, dueDate: 25, completed: false },
  { id: 'p7', supplierName: '利民蔬菜批发', amount: 18500, dueDate: 28, completed: false },
  { id: 'p8', supplierName: '鲜源肉业', amount: 32000, dueDate: 28, completed: false },
  { id: 'p9', supplierName: '海味鲜水产', amount: 15000, dueDate: 28, completed: false },
];

// 日历天数
const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
const firstDayOfWeek = 2; // 2026-07-01 是周三 (0=Sun)

export default function PlanPage() {
  // === 状态管理 ===
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSupplier, setFormSupplier] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('10');

  // === 计算属性 ===

  // 付款完成统计
  const paymentStats = useMemo(() => {
    const total = payments.length;
    const completed = payments.filter((p) => p.completed).length;
    const pending = total - completed;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const completedAmount = payments.filter((p) => p.completed).reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = totalAmount - completedAmount;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, totalAmount, completedAmount, pendingAmount, percentage };
  }, [payments]);

  // 选中日期的付款项
  const selectedPayments = useMemo(() => {
    if (selectedDate === null) return [];
    return payments.filter((p) => p.dueDate === selectedDate);
  }, [payments, selectedDate]);

  // 按日期分组的完整付款明细
  const paymentsByDate = useMemo(() => {
    const map = new Map<number, PaymentItem[]>();
    for (const p of payments) {
      if (!map.has(p.dueDate)) {
        map.set(p.dueDate, []);
      }
      map.get(p.dueDate)!.push(p);
    }
    return map;
  }, [payments]);

  // === 操作方法 ===
  const togglePayment = (id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)));
  };

  const addPayment = () => {
    const amount = parseFloat(formAmount);
    const dueDate = parseInt(formDueDate, 10);
    if (!formSupplier.trim() || isNaN(amount) || amount <= 0 || isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      return;
    }
    const newPayment: PaymentItem = {
      id: `p-${Date.now()}`,
      supplierName: formSupplier.trim(),
      amount,
      dueDate,
      completed: false,
    };
    setPayments((prev) => [...prev, newPayment]);
    // 重置表单
    setFormSupplier('');
    setFormAmount('');
    setFormDueDate('10');
    setShowAddForm(false);
  };

  const cancelAddForm = () => {
    setShowAddForm(false);
    setFormSupplier('');
    setFormAmount('');
    setFormDueDate('10');
  };

  // 检查某日期是否有付款
  const dateHasPayment = (day: number) => {
    return payments.some((p) => p.dueDate === day);
  };

  // 某日期的完成付款数
  const dateCompletedCount = (day: number) => {
    return payments.filter((p) => p.dueDate === day && p.completed).length;
  };

  // 某日期的总付款数
  const dateTotalCount = (day: number) => {
    return payments.filter((p) => p.dueDate === day).length;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">月度计划</h1>
          <p className="text-muted-foreground mt-1">制定和管理餐饮门店的月度经营计划</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[6rem] text-center">{currentMonth}</span>
          <Button variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 月度经营概览统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  预计营收
                </p>
                <p className="text-2xl font-bold mt-1">{formatAmount(monthlyOverview.revenue)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[8rem]">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${(monthlyOverview.revenue / monthlyOverview.revenueTarget) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((monthlyOverview.revenue / monthlyOverview.revenueTarget) * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>月度目标</span>
              <span className="font-medium text-foreground">{formatAmount(monthlyOverview.revenueTarget)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  预计成本
                </p>
                <p className="text-2xl font-bold mt-1">{formatAmount(monthlyOverview.cost)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[8rem]">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${(monthlyOverview.cost / monthlyOverview.costBudget) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((monthlyOverview.cost / monthlyOverview.costBudget) * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>预算控制</span>
              <span className="font-medium text-foreground">{formatAmount(monthlyOverview.costBudget)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  预计利润
                </p>
                <p className="text-2xl font-bold mt-1">{formatAmount(monthlyOverview.profit)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[8rem]">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${(monthlyOverview.profit / monthlyOverview.profitTarget) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((monthlyOverview.profit / monthlyOverview.profitTarget) * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>利润目标</span>
              <span className="font-medium text-foreground">{formatAmount(monthlyOverview.profitTarget)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主区域：付款日历 + 付款进度侧边栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 付款日历视图 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              付款日历
            </CardTitle>
            <CardDescription>点击日期查看该日付款详情</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 星期表头 */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* 日历网格 */}
            <div className="grid grid-cols-7 gap-1">
              {/* 月初空白占位 */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[4.5rem]" />
              ))}
              {daysInMonth.map((day) => {
                const hasPayment = dateHasPayment(day);
                const isToday = day === 10;
                const isSelected = selectedDate === day;
                const total = dateTotalCount(day);
                const completed = dateCompletedCount(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(hasPayment ? day : null)}
                    className={`min-h-[4.5rem] rounded-lg p-1.5 border text-left transition-colors w-full ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : isToday
                          ? 'border-primary bg-primary/5'
                          : hasPayment
                            ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50'
                            : 'border-transparent bg-muted/20'
                    } ${!hasPayment ? 'cursor-default' : 'cursor-pointer'}`}
                    disabled={!hasPayment}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-medium ${
                          isSelected
                            ? 'text-primary'
                            : isToday
                              ? 'text-primary'
                              : hasPayment
                                ? 'text-amber-700'
                                : 'text-muted-foreground'
                        }`}
                      >
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded">
                          今天
                        </span>
                      )}
                    </div>
                    {hasPayment && (
                      <div className="mt-1 space-y-0.5">
                        {/* 显示该日供应商名称 */}
                        {payments
                          .filter((p) => p.dueDate === day)
                          .slice(0, 2)
                          .map((p) => (
                            <div
                              key={p.id}
                              className={`text-[9px] rounded px-1 py-0.5 truncate leading-tight ${
                                p.completed
                                  ? 'bg-green-100 text-green-700 line-through'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.supplierName}
                            </div>
                          ))}
                        {total > 2 && (
                          <div className="text-[9px] text-muted-foreground pl-1">
                            +{total - 2} 项
                          </div>
                        )}
                        {/* 完成进度指示 */}
                        {total > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  completed === total ? 'bg-green-500' : 'bg-amber-400'
                                }`}
                                style={{ width: `${(completed / total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 图例 */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border border-amber-200 bg-amber-50" />
                <span>有付款</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border border-primary bg-primary/5" />
                <span>今天</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded border border-primary bg-primary/10 ring-2 ring-primary/20" />
                <span>已选中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-100 border border-green-200" />
                <span>已完成</span>
              </div>
            </div>

            {/* 选中日期的付款详情 */}
            {selectedDate !== null && selectedPayments.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Receipt className="h-4 w-4 text-primary" />
                    {currentMonth} {selectedDate}日 付款明细
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedPayments.filter((p) => p.completed).length}/{selectedPayments.length} 已完成
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedPayments.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                        p.completed ? 'bg-green-50/50' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={() => togglePayment(p.id)}
                          className="flex-shrink-0 focus:outline-none"
                        >
                          {p.completed ? (
                            <CheckSquare className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-primary/60" />
                          )}
                        </button>
                        <span
                          className={`text-sm truncate ${
                            p.completed ? 'text-muted-foreground line-through' : ''
                          }`}
                        >
                          {p.supplierName}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium flex-shrink-0 ml-2 ${
                          p.completed ? 'text-green-600' : 'text-foreground'
                        }`}
                      >
                        {formatAmount(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedDate !== null && selectedPayments.length === 0 && (
              <div className="mt-4 pt-3 border-t text-center py-4 text-sm text-muted-foreground">
                <Calendar className="h-5 w-5 mx-auto mb-1 opacity-40" />
                <p>{selectedDate}日 暂无付款计划</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：付款进度汇总 + 付款列表 */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                付款进度
              </CardTitle>
              <CardDescription>本月付款执行情况</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0"
              onClick={() => {
                setShowAddForm(true);
                setFormDueDate(String(selectedDate || 10));
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 新增付款内联表单 */}
            {showAddForm && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">新增付款项</span>
                  <button
                    onClick={cancelAddForm}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="supplier" className="text-xs">
                      供应商名称
                    </Label>
                    <Input
                      id="supplier"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      placeholder="例：利民蔬菜批发"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-xs">
                      金额（元）
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="例：15000"
                      className="h-8 text-sm mt-1"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate" className="text-xs">
                      付款日期
                    </Label>
                    <Input
                      id="dueDate"
                      type="number"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      placeholder="1-31"
                      className="h-8 text-sm mt-1"
                      min="1"
                      max="31"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={cancelAddForm}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={addPayment}
                    disabled={!formSupplier.trim() || !formAmount || parseFloat(formAmount) <= 0}
                  >
                    确认添加
                  </Button>
                </div>
              </div>
            )}

            {/* 总数 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">计划付款</span>
              <span className="text-lg font-bold">{paymentStats.total} 笔</span>
            </div>

            {/* 已完成 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                已完成
              </span>
              <span className="text-lg font-bold text-green-600">{paymentStats.completed} 笔</span>
            </div>

            {/* 待付款 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                待付款
              </span>
              <span className="text-lg font-bold text-amber-600">{paymentStats.pending} 笔</span>
            </div>

            {/* 完成进度条 */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">完成进度</span>
                <span className="text-xs font-medium">{paymentStats.percentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${paymentStats.percentage}%`,
                    backgroundColor:
                      paymentStats.percentage === 100
                        ? '#22c55e'
                        : paymentStats.percentage >= 50
                          ? '#84cc16'
                          : '#f59e0b',
                  }}
                />
              </div>
            </div>

            {/* 本月付款明细列表（可勾选） */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  付款明细
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {paymentStats.completed}/{paymentStats.total}
                </span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {payments
                  .sort((a, b) => a.dueDate - b.dueDate)
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg transition-colors ${
                        p.completed ? 'bg-green-50/50' : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      {/* 勾选框 */}
                      <button
                        onClick={() => togglePayment(p.id)}
                        className="flex-shrink-0 focus:outline-none"
                      >
                        {p.completed ? (
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-primary/60" />
                        )}
                      </button>
                      {/* 日期标记 */}
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          p.completed ? 'bg-green-100' : 'bg-amber-100'
                        }`}
                      >
                        <span
                          className={`text-[9px] font-bold ${
                            p.completed ? 'text-green-700' : 'text-amber-700'
                          }`}
                        >
                          {p.dueDate}
                        </span>
                      </div>
                      {/* 供应商名 */}
                      <span
                        className={`text-xs truncate flex-1 ${
                          p.completed ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {p.supplierName}
                      </span>
                      {/* 金额 */}
                      <span
                        className={`text-xs font-medium flex-shrink-0 ${
                          p.completed ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        {formatAmount(p.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部：付款完成统计总览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            月度付款完成总览
          </CardTitle>
          <CardDescription>本月付款执行情况汇总统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">总付款笔数</p>
              <p className="text-2xl font-bold mt-1">{paymentStats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">笔</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 text-center">
              <p className="text-xs text-green-600">已完成</p>
              <p className="text-2xl font-bold mt-1 text-green-700">{paymentStats.completed}</p>
              <p className="text-xs text-green-600 mt-1">
                占比 {paymentStats.percentage}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 text-center">
              <p className="text-xs text-amber-600">待付款</p>
              <p className="text-2xl font-bold mt-1 text-amber-700">{paymentStats.pending}</p>
              <p className="text-xs text-amber-600 mt-1">
                占比 {100 - paymentStats.percentage}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 text-center">
              <p className="text-xs text-blue-600">总金额</p>
              <p className="text-2xl font-bold mt-1 text-blue-700">{formatAmount(paymentStats.totalAmount)}</p>
              <p className="text-xs text-blue-600 mt-1">
                已付 {formatAmount(paymentStats.completedAmount)}
              </p>
            </div>
          </div>

          {/* 总进度条 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">整体完成进度</span>
              <span className="text-sm font-bold">{paymentStats.percentage}%</span>
            </div>
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                style={{
                  width: `${paymentStats.percentage}%`,
                  backgroundColor:
                    paymentStats.percentage === 100
                      ? '#22c55e'
                      : paymentStats.percentage >= 50
                        ? '#84cc16'
                        : paymentStats.percentage > 0
                          ? '#f59e0b'
                          : '#e5e7eb',
                }}
              >
                {paymentStats.percentage > 15 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    {paymentStats.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 按日期分布的付款完成情况 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              按日期分布
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {Array.from(paymentsByDate.entries())
                .sort(([a], [b]) => a - b)
                .map(([day, items]) => {
                  const done = items.filter((i) => i.completed).length;
                  const total = items.length;
                  const pct = Math.round((done / total) * 100);
                  return (
                    <div
                      key={day}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{day}日</span>
                        <span className="text-[10px] text-muted-foreground">
                          {done}/{total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct === 100 ? '#22c55e' : pct > 0 ? '#f59e0b' : '#d1d5db',
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground truncate">
                        {items.map((i) => i.supplierName).join('、')}
                      </div>
                      <div className="text-[10px] font-medium mt-0.5">
                        {formatAmount(items.reduce((s, i) => s + i.amount, 0))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 状态提示 */}
          <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
            {paymentStats.percentage === 100 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">本月所有付款已完成！</span>
              </>
            ) : paymentStats.pending === 0 ? (
              <>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>暂无付款计划</span>
              </>
            ) : (
              <>
                <ListChecks className="h-4 w-4 text-amber-500" />
                <span>
                  还有 <strong className="text-amber-600">{paymentStats.pending}</strong> 笔付款待处理，
                  共 <strong className="text-amber-600">{formatAmount(paymentStats.pendingAmount)}</strong>
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
