'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BadgeCheck,
  ShieldAlert,
  Building2,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Bell,
  Plus,
  Shield,
  ScrollText,
  Search,
  X,
  CalendarCheck,
  RefreshCw,
  FileDigit,
  History,
} from 'lucide-react';

/**
 * 证照管理页面
 * 用于管理餐饮门店的营业执照、食品经营许可证等证照，支持到期提醒、续期管理、搜索筛选等功能
 */

interface LicenseType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  expiryDate: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'not_uploaded';
  color: string;
  bg: string;
}

const licenseTypes: LicenseType[] = [
  {
    id: 'business',
    name: '营业执照',
    description: '工商登记注册证明',
    icon: Building2,
    expiryDate: '2027-06-15',
    status: 'valid',
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    id: 'food_permit',
    name: '食品经营许可证',
    description: '食品经营许可证明',
    icon: ScrollText,
    expiryDate: '2026-12-20',
    status: 'expiring_soon',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  {
    id: 'health_permit',
    name: '卫生许可证',
    description: '公共卫生许可证明',
    icon: Shield,
    expiryDate: '2026-08-01',
    status: 'expiring_soon',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  {
    id: 'fire_safety',
    name: '消防安全许可证',
    description: '消防安全检查合格证明',
    icon: ShieldAlert,
    expiryDate: '2027-03-10',
    status: 'valid',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    id: 'tax_reg',
    name: '税务登记证',
    description: '税务登记注册证明',
    icon: ClipboardList,
    expiryDate: '2028-01-01',
    status: 'valid',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  {
    id: 'alcohol',
    name: '酒类经营许可证',
    description: '酒类商品零售许可证明',
    icon: FileWarning,
    expiryDate: '2026-05-01',
    status: 'expired',
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  {
    id: 'env_protection',
    name: '环评备案',
    description: '环境影响评价备案',
    icon: Shield,
    expiryDate: '-',
    status: 'not_uploaded',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  {
    id: 'staff_health',
    name: '从业人员健康证',
    description: '餐饮从业人员健康证明',
    icon: BadgeCheck,
    expiryDate: '-',
    status: 'not_uploaded',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
];

/** 计算距离到期天数（负数表示已过期） */
function getDaysUntilExpiry(expiryDate: string): number | null {
  if (expiryDate === '-') return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** 获取到期提醒标签 */
function getExpiryWarningBadge(days: number | null) {
  if (days === null) return null;
  if (days <= 0) {
    return (
      <Badge variant="default" className="bg-red-500 text-white hover:bg-red-600 border-0 animate-pulse">
        <AlertTriangle className="h-3 w-3 mr-1" />
        已过期 {Math.abs(days)} 天
      </Badge>
    );
  }
  if (days <= 7) {
    return (
      <Badge variant="default" className="bg-red-500 text-white hover:bg-red-600 border-0">
        <Clock className="h-3 w-3 mr-1" />
        紧急 · {days} 天后到期
      </Badge>
    );
  }
  if (days <= 30) {
    return (
      <Badge variant="default" className="bg-orange-500 text-white hover:bg-orange-600 border-0">
        <Clock className="h-3 w-3 mr-1" />
        即将到期 · {days} 天后到期
      </Badge>
    );
  }
  return null;
}

/** 格式化天数显示 */
function formatDaysRemaining(days: number | null): string {
  if (days === null) return '-';
  if (days <= 0) return `已过期 ${Math.abs(days)} 天`;
  return `剩余 ${days} 天`;
}

function getStatusBadge(status: LicenseType['status']) {
  switch (status) {
    case 'valid':
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          有效
        </Badge>
      );
    case 'expiring_soon':
      return (
        <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">
          <Clock className="h-3 w-3 mr-1" />
          即将到期
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-200 border-0">
          <AlertTriangle className="h-3 w-3 mr-1" />
          已过期
        </Badge>
      );
    case 'not_uploaded':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          未上传
        </Badge>
      );
  }
}

/** 续期弹窗组件 */
function RenewDialog({ license }: { license: LicenseType }) {
  const [open, setOpen] = useState(false);
  const [renewDate, setRenewDate] = useState(() => {
    // 默认续期至当前日期加一年
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });

  const handleRenew = () => {
    // 模拟续期——实际接入 API 后替换此处逻辑
    console.log(`续期证照: ${license.name}, 新到期日: ${renewDate}`);
    setOpen(false);
  };

  const canRenew = license.status !== 'not_uploaded';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!canRenew}
          title={!canRenew ? '请先上传证照' : '申请续期'}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          续期
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {license.name} - 续期申请
          </DialogTitle>
          <DialogDescription>
            请选择新的到期日期，提交后需审核确认。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 当前证照信息 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
            <div
              className={`h-9 w-9 rounded-full ${license.bg} flex items-center justify-center flex-shrink-0`}
            >
              <license.icon className={`h-4 w-4 ${license.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{license.name}</p>
              {license.expiryDate !== '-' && (
                <p className="text-xs text-muted-foreground">
                  当前到期: {license.expiryDate}
                </p>
              )}
            </div>
          </div>

          {/* 续期日期选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">新到期日期</label>
            <Input
              type="date"
              value={renewDate}
              onChange={(e) => setRenewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              请选择证照新的有效截止日期
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleRenew} disabled={!renewDate}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            提交续期申请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LicensesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // 搜索过滤
  const filteredLicenses = useMemo(() => {
    if (!searchQuery.trim()) return licenseTypes;
    const query = searchQuery.toLowerCase().trim();
    return licenseTypes.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 统计
  const validCount = licenseTypes.filter((l) => l.status === 'valid').length;
  const expiringCount = licenseTypes.filter((l) => l.status === 'expiring_soon').length;
  const expiredCount = licenseTypes.filter((l) => l.status === 'expired').length;
  const notUploadedCount = licenseTypes.filter((l) => l.status === 'not_uploaded').length;

  return (
    <div className="space-y-6">
      {/* 页面标题区域 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">证照管理</h1>
        <p className="text-muted-foreground mt-1">管理餐饮门店的营业执照、食品经营许可证等</p>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">有效</p>
              <p className="text-xl font-bold text-green-600">{validCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">即将到期</p>
              <p className="text-xl font-bold text-amber-600">{expiringCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">已过期</p>
              <p className="text-xl font-bold text-red-600">{expiredCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <FileWarning className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">未上传</p>
              <p className="text-xl font-bold text-muted-foreground">{notUploadedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索与筛选栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索证照名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {searchQuery ? (
            <span>
              找到 <strong>{filteredLicenses.length}</strong> 条匹配结果
            </span>
          ) : (
            <span>共 <strong>{licenseTypes.length}</strong> 项证照</span>
          )}
        </div>
      </div>

      {/* 证照列表网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLicenses.map((license) => {
          const daysUntilExpiry = getDaysUntilExpiry(license.expiryDate);
          const expiryWarning = getExpiryWarningBadge(daysUntilExpiry);

          return (
            <Card
              key={license.id}
              className={`hover:shadow-md transition-shadow ${
                expiryWarning
                  ? 'ring-2 ring-red-300 ring-offset-1'
                  : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-full ${license.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <license.icon className={`h-5 w-5 ${license.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{license.name}</p>
                        {getStatusBadge(license.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{license.description}</p>
                      {license.expiryDate !== '-' && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs text-muted-foreground/70">
                            到期日期: {license.expiryDate}
                          </p>
                          {daysUntilExpiry !== null && daysUntilExpiry > 30 && (
                            <span className="text-xs text-muted-foreground/50">
                              · {formatDaysRemaining(daysUntilExpiry)}
                            </span>
                          )}
                        </div>
                      )}
                      {/* 到期高亮警告标记 */}
                      {expiryWarning && (
                        <div className="mt-2">{expiryWarning}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 操作按钮组 */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <RenewDialog license={license} />
                  {license.status === 'not_uploaded' && (
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      上传
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 无匹配结果 */}
      {filteredLicenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">未找到匹配的证照</p>
          <p className="text-sm text-muted-foreground/60 mt-1">尝试修改搜索关键词</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4 mr-1" />
            清除搜索条件
          </Button>
        </div>
      )}

      {/* 证照摘要统计 */}
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">有效证照</p>
              <p className="text-lg font-bold text-green-600">
                {validCount}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  / {licenseTypes.length}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">即将到期（30天内）</p>
              <p className="text-lg font-bold text-amber-600">{expiringCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">已过期</p>
              <p className="text-lg font-bold text-red-600">{expiredCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">未上传</p>
              <p className="text-lg font-bold text-muted-foreground">{notUploadedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能预告区域 */}
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
            <Bell className="h-5 w-5" />
            即将上线功能
          </CardTitle>
          <CardDescription>以下功能正在开发中，敬请期待</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: CalendarCheck,
                title: '到期智能提醒',
                desc: '到期前 30 天自动发送通知至企业微信/飞书，支持多级提醒策略，避免证照过期风险',
                features: ['30天/15天/7天三级提醒', '支持企业微信、飞书、短信通知', '提醒记录可追溯'],
              },
              {
                icon: FileDigit,
                title: '在线续期申请',
                desc: '一键发起续期申请，审批流程线上化，新证照到期日自动计算并更新',
                features: ['在线提交续期材料', '审批进度实时跟踪', '新证照自动归档更新'],
              },
              {
                icon: History,
                title: '归档与审计追溯',
                desc: '历史证照分类归档，支持按年度、证照类型快速检索，便于审计与合规检查',
                features: ['历史版本完整保留', '多维度快速检索', '变更履历全记录'],
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="font-medium text-sm mb-1.5">{feature.title}</p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed mb-2">{feature.desc}</p>
                <ul className="space-y-1">
                  {feature.features.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
