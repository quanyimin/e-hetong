'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  FileText,
  BookOpen,
  Upload,
  Bell,
  Folder,
  Home,
  ShoppingCart,
  Calendar,
  Briefcase,
  FileType,
  Shield,
  CreditCard,
  Building2,
  Settings,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===========================================
// 场景图标映射：图标名称 -> React 组件
// ===========================================
const SCENE_ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  BookOpen,
  Upload,
  Bell,
  Folder,
  Home,
  ShoppingCart,
  Calendar,
  Briefcase,
  FileType,
  Shield,
  CreditCard,
  Building2,
  Settings,
  LayoutDashboard,
};

// ===========================================
// 可选图标列表（供创建/编辑时选择）
// ===========================================
const ICON_OPTIONS = [
  { value: 'FileText', label: '文档' },
  { value: 'BookOpen', label: '书籍' },
  { value: 'Upload', label: '上传' },
  { value: 'Bell', label: '通知' },
  { value: 'Folder', label: '文件夹' },
  { value: 'Home', label: '首页' },
  { value: 'ShoppingCart', label: '购物车' },
  { value: 'Calendar', label: '日历' },
  { value: 'Briefcase', label: '公文包' },
  { value: 'FileType', label: '文件类型' },
  { value: 'Shield', label: '安全' },
  { value: 'CreditCard', label: '信用卡' },
  { value: 'Building2', label: '建筑' },
  { value: 'Settings', label: '设置' },
  { value: 'LayoutDashboard', label: '仪表盘' },
];

// 状态标签映射
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  active: { label: '启用', variant: 'success' },
  inactive: { label: '停用', variant: 'secondary' },
};

// ===========================================
// 类型定义
// ===========================================

interface Scene {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
}

interface IndustryVersion {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  scenes: string[]; // scene code 列表
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  industryVersionId: string | null;
}

// 表单数据类型
interface VersionFormData {
  code: string;
  name: string;
  icon: string;
  description: string;
  status: 'active' | 'inactive';
  scenes: string[]; // scene code 列表
}

// 默认表单值
const DEFAULT_FORM_DATA: VersionFormData = {
  code: '',
  name: '',
  icon: 'FileText',
  description: '',
  status: 'active',
  scenes: [],
};

// ===========================================
// 页面组件
// ===========================================

export default function AdminIndustryVersionPage() {
  // ---------- 全局状态 ----------
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [versions, setVersions] = React.useState<IndustryVersion[]>([]);
  const [allScenes, setAllScenes] = React.useState<Scene[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);

  // ---------- 创建/编辑弹窗状态 ----------
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingVersion, setEditingVersion] = React.useState<IndustryVersion | null>(null);
  const [formData, setFormData] = React.useState<VersionFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = React.useState(false);

  // ---------- 删除确认弹窗状态 ----------
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingVersion, setDeletingVersion] = React.useState<IndustryVersion | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ---------- 场景预览展开状态 ----------
  const [expandedVersionId, setExpandedVersionId] = React.useState<string | null>(null);

  // ---------- 租户版本分配 ----------
  const [savingTenantId, setSavingTenantId] = React.useState<string | null>(null);

  // ===========================================
  // 数据加载
  // ===========================================

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [versionsRes, scenesRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/industry-versions'),
        fetch('/api/admin/scenes'),
        fetch('/api/admin/tenants'),
      ]);

      // 独立处理每个接口的响应，即使某个接口失败也不阻断整体
      if (versionsRes.ok) {
        const versionsData = await versionsRes.json();
        setVersions(versionsData.code === 0 ? versionsData.data || [] : []);
      } else {
        console.error('获取行业版本列表失败', versionsRes.status);
      }

      if (scenesRes.ok) {
        const scenesData = await scenesRes.json();
        setAllScenes(scenesData.code === 0 ? scenesData.data || [] : []);
      } else {
        console.error('获取场景列表失败', scenesRes.status);
      }

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData.code === 0 ? tenantsData.data || [] : []);
      } else {
        console.error('获取租户列表失败', tenantsRes.status);
      }
    } catch (e) {
      console.error('加载数据失败', e);
      setError('加载数据失败，请检查网络连接后刷新重试');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ===========================================
  // 创建/编辑版本
  // ===========================================

  /** 打开创建弹窗 */
  const handleOpenCreate = () => {
    setEditingVersion(null);
    setFormData(DEFAULT_FORM_DATA);
    setDialogOpen(true);
  };

  /** 打开编辑弹窗 */
  const handleOpenEdit = (version: IndustryVersion) => {
    setEditingVersion(version);
    setFormData({
      code: version.code,
      name: version.name,
      icon: version.icon,
      description: version.description,
      status: version.status,
      scenes: [...version.scenes],
    });
    setDialogOpen(true);
  };

  /** 切换场景选中状态 */
  const handleToggleScene = (sceneCode: string) => {
    setFormData((prev) => ({
      ...prev,
      scenes: prev.scenes.includes(sceneCode)
        ? prev.scenes.filter((s) => s !== sceneCode)
        : [...prev.scenes, sceneCode],
    }));
  };

  /** 提交创建/更新 */
  const handleSaveVersion = async () => {
    // 基本表单校验
    if (!formData.code.trim()) {
      alert('请输入版本编码');
      return;
    }
    if (!formData.name.trim()) {
      alert('请输入版本名称');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingVersion;
      const url = isEdit
        ? `/api/admin/industry-versions/${editingVersion!.id}`
        : '/api/admin/industry-versions';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `请求失败 (${res.status})`);
      }

      // 重新加载数据
      await loadData();
      setDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败';
      alert(msg);
      console.error('保存行业版本失败', e);
    } finally {
      setSaving(false);
    }
  };

  // ===========================================
  // 删除版本
  // ===========================================

  /** 打开删除确认弹窗 */
  const handleOpenDelete = (version: IndustryVersion) => {
    setDeletingVersion(version);
    setDeleteDialogOpen(true);
  };

  /** 确认删除 */
  const handleConfirmDelete = async () => {
    if (!deletingVersion) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/industry-versions/${deletingVersion.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `删除失败 (${res.status})`);
      }

      await loadData();
      setDeleteDialogOpen(false);
      setDeletingVersion(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '删除失败';
      alert(msg);
      console.error('删除行业版本失败', e);
    } finally {
      setDeleting(false);
    }
  };

  // ===========================================
  // 租户版本分配
  // ===========================================

  /** 更新租户的行业版本 */
  const handleTenantVersionChange = (tenantId: string, versionId: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, industryVersionId: versionId || null } : t))
    );
  };

  /** 保存租户版本分配 */
  const handleSaveTenantVersion = async (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    setSavingTenantId(tenantId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industryVersionId: tenant.industryVersionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `保存失败 (${res.status})`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败';
      alert(msg);
      console.error('保存租户版本分配失败', e);
    } finally {
      setSavingTenantId(null);
    }
  };

  // ===========================================
  // 辅助函数
  // ===========================================

  /** 根据 icon 名称获取对应的图标组件 */
  const getIconComponent = (iconName: string): React.ElementType => {
    return SCENE_ICON_MAP[iconName] || FileText;
  };

  /** 获取场景详情（按 code 查找） */
  const getSceneDetail = (sceneCode: string): Scene | undefined => {
    return allScenes.find((s) => s.code === sceneCode);
  };

  // ===========================================
  // 渲染
  // ===========================================

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 加载失败状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mb-3 text-destructive" />
        <p className="text-lg font-medium mb-1">加载失败</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 & 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">行业版本管理</h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理行业版本及场景插件配置</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          新建版本
        </Button>
      </div>

      {/* =========================================== */}
      {/* 版本列表 */}
      {/* =========================================== */}
      {versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <LayoutDashboard className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">暂无行业版本</p>
            <p className="text-sm mt-1">点击「新建版本」创建第一个行业版本</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {versions.map((version) => {
            const IconComp = getIconComponent(version.icon);
            const statusCfg = STATUS_CONFIG[version.status] || STATUS_CONFIG.inactive;
            const isExpanded = expandedVersionId === version.id;

            return (
              <Card key={version.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    {/* 左侧：图标 + 基本信息 */}
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <IconComp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {version.name}
                          <Badge variant={statusCfg.variant} className="text-xs">
                            {statusCfg.label}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          编码: {version.code}
                          <span className="mx-2">·</span>
                          场景: {version.scenes.length} 个
                        </CardDescription>
                      </div>
                    </div>
                    {/* 右侧：操作按钮 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="编辑"
                        onClick={() => handleOpenEdit(version)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="删除"
                        onClick={() => handleOpenDelete(version)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* 版本描述 */}
                  {version.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {version.description}
                    </p>
                  )}

                  {/* 场景预览折叠按钮 */}
                  {version.scenes.length > 0 && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() =>
                        setExpandedVersionId(isExpanded ? null : version.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      包含场景 ({version.scenes.length})
                    </button>
                  )}

                  {/* 场景详情列表（展开时显示） */}
                  {isExpanded && version.scenes.length > 0 && (
                    <div className="mt-2 space-y-1.5 pl-5">
                      {version.scenes.map((sceneCode) => {
                        const scene = getSceneDetail(sceneCode);
                        if (!scene) {
                          return (
                            <div
                              key={sceneCode}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>{sceneCode}</span>
                            </div>
                          );
                        }
                        const SceneIcon = getIconComponent(scene.icon);
                        return (
                          <div
                            key={scene.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <SceneIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">{scene.name}</span>
                            <span className="text-muted-foreground">
                              ({scene.code})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 无场景时提示 */}
                  {version.scenes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      暂未配置场景
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* =========================================== */}
      {/* 租户版本分配 */}
      {/* =========================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">租户版本分配</CardTitle>
          <CardDescription>为各租户分配行业版本，变更后点击「保存」生效</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无租户数据</p>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* 左侧：租户名称 */}
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {tenant.name[0]}
                    </div>
                    <span className="text-sm font-medium">{tenant.name}</span>
                  </div>

                  {/* 右侧：版本选择 + 保存按钮 */}
                  <div className="flex items-center gap-3">
                    <Select
                      value={tenant.industryVersionId || ''}
                      onValueChange={(value) =>
                        handleTenantVersionChange(tenant.id, value)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择行业版本" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          <span className="text-muted-foreground">不分配</span>
                        </SelectItem>
                        {versions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="flex items-center gap-2">
                              {v.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      loading={savingTenantId === tenant.id}
                      onClick={() => handleSaveTenantVersion(tenant.id)}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      保存
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================== */}
      {/* 创建/编辑版本弹窗 */}
      {/* =========================================== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVersion ? '编辑行业版本' : '新建行业版本'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 版本编码 */}
            <div className="space-y-1.5">
              <Label htmlFor="code">
                版本编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="如：industry_legal"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                disabled={!!editingVersion}
              />
              <p className="text-xs text-muted-foreground">
                唯一标识，创建后不可修改
              </p>
            </div>

            {/* 版本名称 */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                版本名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="如：法律行业版"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* 图标选择 */}
            <div className="space-y-1.5">
              <Label htmlFor="icon">图标</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, icon: value }))
                }
              >
                <SelectTrigger id="icon" className="w-full">
                  <SelectValue placeholder="选择图标" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => {
                    const OptIcon = getIconComponent(opt.value);
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <OptIcon className="h-4 w-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 状态选择 */}
            <div className="space-y-1.5">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <Badge variant="success" className="text-xs">
                      启用
                    </Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge variant="secondary" className="text-xs">
                      停用
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 版本描述 */}
            <div className="space-y-1.5">
              <Label htmlFor="description">版本描述</Label>
              <textarea
                id="description"
                rows={3}
                className={cn(
                  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'ring-offset-background placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
                placeholder="描述该版本的适用范围和特点..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* 场景选择器 */}
            <div className="space-y-1.5">
              <Label>关联场景</Label>
              {allScenes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  暂无可用场景数据
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {allScenes.map((scene) => {
                    const SceneIcon = getIconComponent(scene.icon);
                    const isSelected = formData.scenes.includes(scene.code);
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'hover:bg-muted border border-transparent'
                        )}
                        onClick={() => handleToggleScene(scene.code)}
                      >
                        {/* 自定义复选框 */}
                        <div
                          className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <SceneIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{scene.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 弹窗底部按钮 */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleSaveVersion} loading={saving}>
              <Check className="h-4 w-4 mr-1" />
              {editingVersion ? '保存修改' : '创建版本'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================== */}
      {/* 删除确认弹窗 */}
      {/* =========================================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              确认删除
            </DialogTitle>
          </DialogHeader>

          <div className="py-3">
            {deletingVersion && (
              <div className="space-y-2 text-sm">
                <p>
                  确定要删除行业版本
                  <span className="font-semibold">「{deletingVersion.name}」</span>
                  吗？
                </p>
                <p className="text-muted-foreground">
                  编码: {deletingVersion.code}
                  <span className="mx-2">·</span>
                  关联场景: {deletingVersion.scenes.length} 个
                </p>
                <p className="text-xs text-destructive flex items-start gap-1 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  此操作不可撤销，删除后已分配该版本的租户将失去版本关联。
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={handleConfirmDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
