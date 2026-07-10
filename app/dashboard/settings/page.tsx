'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User, Mail, Phone, Crown, Bell, Shield, Key, Smartphone,
  CheckCircle2, AlertTriangle, Sparkles, Loader2, Check,
  Building2, Home, Store, Plus, RefreshCw, LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const TENANT_LABELS: Record<string, string> = {
  PERSONAL: '个人账号',
  INDIVIDUAL: '个体工商户',
  ENTERPRISE: '企业账号',
};

const TENANT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PERSONAL: Home,
  INDIVIDUAL: Store,
  ENTERPRISE: Building2,
};

export default function SettingsPage() {
  const { user, tenant, tenantList, switchTenant, updateUser, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState('profile');

  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [phone, setPhone] = React.useState(user?.phone || '');
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [showNewTenantDialog, setShowNewTenantDialog] = React.useState(false);
  const [newTenantType, setNewTenantType] = React.useState<'PERSONAL' | 'ENTERPRISE'>('PERSONAL');
  const [newTenantName, setNewTenantName] = React.useState('');
  const [creatingTenant, setCreatingTenant] = React.useState(false);

  // 同步用户数据
  React.useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name, email }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser({ name, email });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // 网络错误静默处理
    }
    setSaving(false);
  };

  const handleCreateTenant = async () => {
    if (!newTenantName.trim() || !user?.id) return;
    setCreatingTenant(true);
    try {
      const res = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newTenantName,
          type: newTenantType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewTenantDialog(false);
        setNewTenantName('');
        window.location.reload();
      }
    } catch {
      // 网络错误静默处理
    }
    setCreatingTenant(false);
  };

  const handleSwitchTenant = (id: string) => {
    switchTenant(id);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground mt-1">管理账户信息、通知偏好和安全设置</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />个人信息</TabsTrigger>
          <TabsTrigger value="account"><Building2 className="h-4 w-4 mr-2" />账号管理</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />通知设置</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />安全设置</TabsTrigger>
        </TabsList>

        {/* Tab 1: 个人信息 */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {user?.name?.[0] || user?.email?.[0] || '?'}
                </div>
                <div>
                  <p className="font-medium">{user?.name || '未设置姓名'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || user?.phone || ''}</p>
                  <Badge variant="outline" className="mt-1">
                    {user?.role === 'admin' ? '管理员' : '普通用户'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入您的姓名" />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="绑定手机号可接收提醒" type="tel" disabled />
                <p className="text-xs text-muted-foreground">手机号暂不支持在线修改</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  保存修改
                </Button>
                {saveSuccess && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />保存成功
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 会员信息 */}
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <Crown className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user?.memberLevel === 'pro' ? '年度会员' : '免费版'}</h2>
                    <p className="text-sm text-muted-foreground">
                      {user?.memberLevel === 'pro' ? '无限合同 · AI智能解析 · 邮件提醒' : '基础合同管理 · 手动分类'}
                    </p>
                  </div>
                </div>
                {user?.memberLevel !== 'pro' && (
                  <Button onClick={() => router.push('/pricing')} className="gap-1">
                    <Sparkles className="h-4 w-4" />升级会员
                  </Button>
                )}
              </div>
              {user?.memberLevel === 'pro' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {['无限合同', 'AI智能解析', '合同导出', '邮件提醒', '高优客服'].map((f) => (
                    <Badge key={f} variant="secondary" className="bg-amber-100/50 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />{f}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: 账号管理 */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />我的账号
              </CardTitle>
              <CardDescription>一个手机号可同时拥有个人账号和企业账号，数据完全隔离</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenantList.map((t) => {
                const Icon = TENANT_ICONS[t.sceneType] || Home;
                const isActive = tenant?.tenantId === t.tenantId;
                return (
                  <div key={t.tenantId} className={`p-4 rounded-xl border-2 transition-all ${isActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${isActive ? 'bg-primary text-white' : 'bg-muted'} flex items-center justify-center`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{t.tenantName}</p>
                            <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">
                              {isActive ? '当前' : '切换'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {TENANT_LABELS[t.sceneType] || '个人'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t.role === 'OWNER' ? '所有者' : t.role === 'ADMIN' ? '管理员' : '成员'}
                            {' · '}数据完全隔离
                          </p>
                        </div>
                      </div>
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleSwitchTenant(t.tenantId)}>
                          <RefreshCw className="h-3 w-3 mr-1" />切换到此账号
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              <Separator />

              <div>
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowNewTenantDialog(true)}>
                  <Plus className="h-4 w-4" />创建新账号
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  用同一手机号创建新的企业账号或个人账号，数据完全隔离
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 新建账号弹窗 */}
          {showNewTenantDialog && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowNewTenantDialog(false)}>
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">创建新账号</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>账号类型</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`flex-1 p-3 rounded-lg border-2 text-center ${newTenantType === 'PERSONAL' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                        onClick={() => setNewTenantType('PERSONAL')}
                      >
                        <Home className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">个人账号</p>
                        <p className="text-xs text-muted-foreground">个人使用</p>
                      </button>
                      <button
                        type="button"
                        className={`flex-1 p-3 rounded-lg border-2 text-center ${newTenantType === 'ENTERPRISE' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                        onClick={() => setNewTenantType('ENTERPRISE')}
                      >
                        <Building2 className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">企业账号</p>
                        <p className="text-xs text-muted-foreground">公司/团队使用</p>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>账号名称</Label>
                    <Input
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      placeholder={newTenantType === 'PERSONAL' ? '如：我的个人空间' : '如：XX科技有限公司'}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowNewTenantDialog(false)}>取消</Button>
                    <Button className="flex-1" onClick={handleCreateTenant} disabled={creatingTenant || !newTenantName.trim()}>
                      {creatingTenant ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      创建
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><LogOut className="h-5 w-5 text-destructive" />退出登录</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">退出后需要重新输入账号密码登录</p>
              <Button variant="destructive" onClick={logout}>退出当前账号</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: 通知设置 */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />通知偏好</CardTitle>
              <CardDescription>选择您希望接收提醒的方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Bell, title: '站内信通知', desc: '登录后在系统内接收提醒', key: 'in_app', enabled: true, pro: false },
                { icon: Mail, title: '邮件通知', desc: '通过邮箱接收到期提醒、账单通知', key: 'email', enabled: user?.memberLevel === 'pro', pro: true },
                { icon: Smartphone, title: '短信通知', desc: '通过手机号接收重要到期提醒', key: 'sms', enabled: false, pro: true },
                { icon: Bell, title: '微信通知', desc: '通过公众号接收合同到期提醒', key: 'wechat', enabled: false, pro: true },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <ItemIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      {item.enabled ? (
                        <Badge variant="success" className="bg-green-100 text-green-700 border-green-200 shrink-0">已开启</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-primary shrink-0" onClick={() => router.push('/pricing')}>
                          升级解锁
                        </Button>
                      )}
                    </div>
                    <Separator />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: 安全设置 */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Key className="h-5 w-5 text-primary" />登录密码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>当前密码</Label>
                <Input type="password" placeholder="输入当前密码" />
              </div>
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input type="password" placeholder="至少6位" />
              </div>
              <div className="space-y-2">
                <Label>确认新密码</Label>
                <Input type="password" placeholder="再次输入新密码" />
              </div>
              <Button variant="outline">修改密码</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />登录设备</CardTitle>
              <CardDescription>管理已登录的设备</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">当前设备</p>
                    <p className="text-xs text-muted-foreground">Mac · Chrome · 刚刚在线</p>
                  </div>
                </div>
                <Badge variant="success" className="bg-green-100 text-green-700 shrink-0">当前</Badge>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">iPhone 15</p>
                    <p className="text-xs text-muted-foreground">Safari · 3天前</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0">移除</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
