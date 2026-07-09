'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Plus, Edit, Trash2, Users, ChevronRight,
  Home, Store, Briefcase, LayoutDashboard, UtensilsCrossed,
  Smartphone, Loader2, CheckCircle2, XCircle, ShoppingCart,
  Calendar, Shield, CreditCard, FileType, ArrowLeftRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ============================================================
// 场景分类定义 — 用于版本对比预览
// ============================================================
const SCENE_CATEGORIES = {
  base: {
    label: '通用基础功能',
    codes: ['contract_mgmt', 'financial_ledger', 'contract_upload', 'reminder', 'contract_folder'],
    desc: '所有行业版本均包含的基础合同管理能力',
  },
  industry: {
    label: '行业专属功能',
    desc: '根据所选行业版本自动启用的特色功能插件',
  },
  admin: {
    label: '管理功能',
    codes: ['tenant_settings', 'settings'],
    desc: '始终可用的管理与设置功能',
  },
};

/** 各行业版本独占的场景（用于对比时标记差异） */
const INDUSTRY_SCENE_MAP: Record<string, { code: string; name: string; icon: string }[]> = {
  landlord: [{ code: 'rent_collection', name: '租约管理', icon: 'Home' }],
  restaurant: [
    { code: 'supplier_purchase', name: '供应商采购', icon: 'ShoppingCart' },
    { code: 'monthly_planning', name: '月度计划', icon: 'Calendar' },
  ],
  legal: [
    { code: 'case_management', name: '案件管理', icon: 'Briefcase' },
    { code: 'document_template', name: '文书模板', icon: 'FileType' },
  ],
  tech: [
    { code: 'ip_management', name: '知识产权', icon: 'Shield' },
    { code: 'subscription_billing', name: '订阅计费', icon: 'CreditCard' },
  ],
};
const VERSION_ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Home, UtensilsCrossed, Briefcase, Smartphone,
};

const TENANT_TYPE_OPTIONS = [
  { value: 'PERSONAL', label: '个人', icon: Home },
  { value: 'INDIVIDUAL', label: '个体工商户', icon: Store },
  { value: 'ENTERPRISE', label: '企业', icon: Building2 },
];

interface IndustryVersion {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string | null;
  sortOrder: number;
  scenes: { id: string; name: string; icon: string; code: string }[];
}

export default function TenantManagementPage() {
  const { tenantList, user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [versions, setVersions] = useState<IndustryVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    type: 'PERSONAL' as const,
    sceneType: 'GENERAL' as const,
    industry: '',
    creditCode: '',
    industryVersionId: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ============================================================
  // 加载行业版本列表
  // ============================================================
  useEffect(() => {
    setLoadingVersions(true);
    fetch('/api/admin/industry-versions')
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 0 && res.data?.list) setVersions(res.data.list);
      })
      .catch(() => {})
      .finally(() => setLoadingVersions(false));
  }, []);

  // 选中的版本
  const selectedVersion = versions.find((v) => v.id === newTenant.industryVersionId);

  const handleCreateTenant = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: newTenant.name,
          type: newTenant.type,
          sceneType: 'GENERAL',
          industry: newTenant.industry,
          creditCode: newTenant.creditCode,
          industryVersionId: newTenant.industryVersionId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateDialog(false);
        setNewTenant({ name: '', type: 'PERSONAL', sceneType: 'GENERAL', industry: '', creditCode: '', industryVersionId: '' });
        window.location.reload();
      } else {
        setCreateError(data.error || data.message || '创建失败，请重试');
      }
    } catch (error) {
      setCreateError('网络错误，请检查连接后重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================== 页面标题 ======================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">主体管理</h1>
          <p className="text-muted-foreground mt-1">管理您的个人和企业主体，数据独立隔离</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setCreateError(''); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              创建主体
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>创建新主体</DialogTitle>
              <DialogDescription>
                创建一个新的主体空间，选择行业版本后自动加载对应功能菜单与模板
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* 主体名称 */}
              <div className="space-y-2">
                <Label>主体名称</Label>
                <Input
                  placeholder="例如：我的合同、XX公司"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                />
              </div>

              {/* 主体类型 */}
              <div className="space-y-2">
                <Label>主体类型</Label>
                <Select value={newTenant.type} onValueChange={(v) => setNewTenant({ ...newTenant, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENANT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <opt.icon className="h-4 w-4 mr-2 inline" />
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ===== 行业版本选择 — 增强对比预览 ===== */}
              <div className="space-y-3">
                <Label>行业版本</Label>

                {/* 版本卡片网格 */}
                <div className="grid grid-cols-2 gap-2">
                  {versions.map((v) => {
                    const VerIcon = VERSION_ICONS[v.icon] || LayoutDashboard;
                    const isSelected = newTenant.industryVersionId === v.id;
                    const sceneCount = INDUSTRY_SCENE_MAP[v.code]?.length || 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setNewTenant({ ...newTenant, industryVersionId: v.id })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-input hover:bg-accent hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <VerIcon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>{v.name}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{v.description || ''}</p>
                        <div className="flex gap-1 mt-1.5">
                          {/* 基础场景指示点 */}
                          {Array.from({ length: SCENE_CATEGORIES.base.codes!.length }).map((_, i) => (
                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          ))}
                          {/* 行业专属场景指示点 */}
                          {Array.from({ length: sceneCount }).map((_, i) => (
                            <div key={i} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                  {loadingVersions && <div className="col-span-2 py-4 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-1" />加载中...</div>}
                </div>

                {/* ===== 已选版本：分场景对比详表 ===== */}
                {selectedVersion && (
                  <div className="rounded-lg border overflow-hidden">
                    {/* 版本概要 */}
                    <div className="p-3 bg-muted/30 border-b flex items-center gap-2">
                      {(() => {
                        const VIcon = VERSION_ICONS[selectedVersion.icon] || LayoutDashboard;
                        return <VIcon className="h-4 w-4 text-primary" />;
                      })()}
                      <span className="text-sm font-semibold">{selectedVersion.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {selectedVersion.scenes.length} 个功能模块
                      </span>
                    </div>

                    {/* 通用基础功能 — 始终有 */}
                    <div className="p-3 border-b last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">{SCENE_CATEGORIES.base.label}</span>
                        <span className="text-xs text-muted-foreground">· {SCENE_CATEGORIES.base.desc}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SCENE_CATEGORIES.base.codes!.map((code) => {
                          const scene = selectedVersion.scenes.find((s) => s.code === code);
                          return scene ? (
                            <div key={code} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-green-50 dark:bg-green-950/30 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                              <span className="text-green-700 dark:text-green-400">{scene.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* 行业专属功能 — 按版本对比 */}
                    <div className="p-3 border-b last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowLeftRight className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{SCENE_CATEGORIES.industry.label}</span>
                        <span className="text-xs text-muted-foreground">· {SCENE_CATEGORIES.industry.desc}</span>
                      </div>

                      {/* 对比网格：行=场景 列=版本 */}
                      <div className="space-y-1">
                        {Object.entries(INDUSTRY_SCENE_MAP).map(([verCode, scenes]) =>
                          scenes.map((scene) => {
                            const isIncluded = selectedVersion.code === verCode;
                            const InSceneIcon = {
                              ShoppingCart, Calendar, Home, Briefcase, FileType, Shield, CreditCard,
                            }[scene.icon] || LayoutDashboard;
                            return (
                              <div key={scene.code} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border ${
                                isIncluded
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'bg-muted/20 border-transparent opacity-50'
                              }`}>
                                {isIncluded
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                  : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                }
                                <InSceneIcon className={`h-3.5 w-3.5 shrink-0 ${
                                  isIncluded ? 'text-primary' : 'text-muted-foreground/40'
                                }`} />
                                <span className={isIncluded ? 'font-medium text-foreground' : 'text-muted-foreground/50'}>
                                  {scene.name}
                                </span>
                                {/* 显示归属版本 */}
                                {!isIncluded && (
                                  <span className="text-[10px] text-muted-foreground/40 ml-auto">
                                    需切换「{versions.find(v => v.code === verCode)?.name}」启用
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 管理功能 — 始终有 */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">{SCENE_CATEGORIES.admin.label}</span>
                        <span className="text-xs text-muted-foreground">· {SCENE_CATEGORIES.admin.desc}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SCENE_CATEGORIES.admin.codes!.map((code) => {
                          const scene = selectedVersion.scenes.find((s) => s.code === code);
                          return scene ? (
                            <div key={code} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-green-50 dark:bg-green-950/30 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                              <span className="text-green-700 dark:text-green-400">{scene.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 企业信息 */}
              {newTenant.type !== 'PERSONAL' && (
                <>
                  <div className="space-y-2">
                    <Label>所属行业</Label>
                    <Input
                      placeholder="例如：餐饮、建筑、科技"
                      value={newTenant.industry}
                      onChange={(e) => setNewTenant({ ...newTenant, industry: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>营业执照号</Label>
                    <Input
                      placeholder="企业填写营业执照统一社会信用代码"
                      value={newTenant.creditCode}
                      onChange={(e) => setNewTenant({ ...newTenant, creditCode: e.target.value })}
                    />
                  </div>
                </>
              )}

              {createError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {createError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating} className="flex-1">取消</Button>
                <Button onClick={handleCreateTenant} disabled={!newTenant.name || creating} className="flex-1">
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />创建中...</> : '创建'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ======================== 主体列表 ======================== */}
      {tenantList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">暂无主体</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              您还没有创建任何主体。点击下方按钮创建您的第一个主体空间，个人和企业数据将独立隔离管理。
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              创建第一个主体
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenantList.map((t) => {
          const typeInfo = TENANT_TYPE_OPTIONS.find((o) => o.value === t.sceneType) || TENANT_TYPE_OPTIONS[0];
          const TypeIcon = typeInfo.icon as React.ElementType;
          const isEnterpriseType = t.sceneType === 'ENTERPRISE';
          const isIndividualType = t.sceneType === 'INDIVIDUAL';
          return (
            <Card key={t.tenantId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    isEnterpriseType ? 'bg-blue-100' : isIndividualType ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    <TypeIcon className={`h-6 w-6 ${
                      isEnterpriseType ? 'text-blue-600' : isIndividualType ? 'text-amber-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{t.tenantName}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.role === 'OWNER' ? '所有者' : t.role === 'ADMIN' ? '管理员' : t.role === 'FINANCE' ? '财务' : t.role === 'STAFF' ? '业务员' : '查看者'}
                </p>
                {isEnterpriseType && (
                  <div className="mb-4 p-2.5 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">邀请码</p>
                    <p className="text-sm font-mono font-medium tracking-wider select-all">{t.tenantId}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/tenants/members?tenantId=${t.tenantId}`} className="gap-1">
                      <Users className="h-4 w-4" />成员管理
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1">
                    进入<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {/* ======================== 数据隔离说明 ======================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">数据隔离说明</CardTitle>
          <CardDescription>不同主体之间的数据完全隔离，保护您的业务数据安全</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <Building2 className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-medium">独立存储</h4>
              <p className="text-sm text-muted-foreground">每个主体拥有独立的数据存储空间</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Users className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-medium">权限控制</h4>
              <p className="text-sm text-muted-foreground">精细的角色权限管理，按需分配访问权限</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <Briefcase className="h-6 w-6 text-primary mb-2" />
              <h4 className="font-medium">灵活切换</h4>
              <p className="text-sm text-muted-foreground">一键切换不同主体，高效管理多业务</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}