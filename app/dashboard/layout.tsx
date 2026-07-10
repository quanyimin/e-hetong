'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Bell, Settings, Upload, ChevronLeft, Gift, Search, Building2, BadgeCheck, UtensilsCrossed,
  CheckCircle, Stamp, History, Camera, Mail, Wand2, Store, DollarSign, LogOut, Sparkles, Loader2, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { TenantSwitcher } from '@/components/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  distributorOnly?: boolean;
  enterpriseOnly?: boolean;
  mobileOnly?: boolean;
}

const ALL_ITEMS: SidebarItem[] = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/contracts', label: '合同管理', icon: FileText },
  { href: '/dashboard/upload', label: '上传合同', icon: Upload },
  { href: '/dashboard/camera', label: '拍照上传', icon: Camera, mobileOnly: true },
  { href: '/dashboard/email', label: '邮箱导入', icon: Mail },
  { href: '/dashboard/reminders', label: '提醒管理', icon: Bell },
  // 行业插件
  { href: '/dashboard/landlord', label: '房东物业', icon: Building2 },
  { href: '/dashboard/restaurant', label: '餐饮门店', icon: UtensilsCrossed },
  { href: '/dashboard/plugins', label: '插件商店', icon: Store },
  // 更多
  { href: '/dashboard/licenses', label: '证照管理', icon: BadgeCheck },
  { href: '/dashboard/assets', label: '资产管理', icon: Building2 },
  { href: '/dashboard/contracts/generate', label: 'AI生成合同', icon: Wand2 },
  { href: '/dashboard/search', label: '全局搜索', icon: Search },
  // 企业版
  { href: '/dashboard/finance', label: '财务看板', icon: DollarSign, enterpriseOnly: true },
  { href: '/dashboard/enterprise/org', label: '组织架构', icon: Building2, enterpriseOnly: true },
  { href: '/dashboard/enterprise/approval', label: '审批管理', icon: CheckCircle, enterpriseOnly: true },
  { href: '/dashboard/enterprise/seals', label: '用印管理', icon: Stamp, enterpriseOnly: true },
  { href: '/dashboard/enterprise/audit', label: '审计日志', icon: History, enterpriseOnly: true },
  { href: '/dashboard/distribution', label: '分销中心', icon: Gift, distributorOnly: true },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenant, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isDev = process.env.NODE_ENV === 'development';
  const isEnterprise = tenant?.sceneType === 'ENTERPRISE';

  // 用户菜单
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // 创建企业弹窗
  const [showEnterpriseModal, setShowEnterpriseModal] = React.useState(false);
  const [enterpriseName, setEnterpriseName] = React.useState('');
  const [legalPerson, setLegalPerson] = React.useState('');
  const [validUntil, setValidUntil] = React.useState('');
  const [creatingEnterprise, setCreatingEnterprise] = React.useState(false);

  const handleCreateEnterprise = async () => {
    setCreatingEnterprise(true);
    try {
      const res = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: enterpriseName || '我的企业',
          type: 'ENTERPRISE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('企业账号创建成功');
        setShowEnterpriseModal(false);
        window.location.reload();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch {
      toast.error('创建失败，请检查网络');
    }
    setCreatingEnterprise(false);
  };

  // 营业执照OCR识别
  const handleBizLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/ocr/qianfan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, type: 'business_license' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            // 简单解析识别文本
            const lines = data.text.split('\n');
            lines.forEach((line: string) => {
              if (line.includes('名称') || line.includes('企业')) setEnterpriseName(prev => prev || line.replace(/.*[：:]\s*/, '').trim());
              if (line.includes('法人') || line.includes('法定代表人')) setLegalPerson(prev => prev || line.replace(/.*[：:]\s*/, '').trim());
              if (line.includes('期限') || line.includes('有效期')) {
                const match = line.match(/\d{4}[-年]\d{1,2}[-月]\d{1,2}/);
                if (match) setValidUntil(prev => prev || match[0].replace(/年/g, '-').replace(/月/g, '-'));
              }
            });
          }
        }
      } catch {
        // OCR 识别失败不影响手动输入
      }
    };
    reader.readAsDataURL(file);
  };

  const visibleItems = ALL_ITEMS.filter((item) => {
    if (item.distributorOnly && !isDev) return false;
    if (item.enterpriseOnly && !isEnterprise) return false;
    return true;
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className={cn('border-r bg-muted/20 transition-all duration-300 hidden md:block', sidebarOpen ? 'w-60' : 'w-16')}>
        <div className="flex h-14 items-center justify-between px-4 border-b">
          {sidebarOpen && <span className="text-sm font-semibold text-muted-foreground">导航菜单</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
        </div>
        <nav className="p-2 space-y-1">
          {visibleItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                title={item.label}>
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background">
        <div className="flex items-center justify-around py-2">
          {visibleItems.slice(0, 5).map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
                <item.icon className="h-5 w-5" /><span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {/* 全局搜索栏 */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between px-4 md:px-8 py-2.5">
            <TenantSwitcher />
            <div className="flex-1 max-w-md mx-4">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2">
              {/* 用户头像菜单 */}
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium hover:bg-primary/20 transition-colors">
                  {user?.name?.[0] || user?.email?.[0] || '?'}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-10 w-56 rounded-xl border bg-popover p-1 shadow-xl z-50">
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium">{user?.name || '用户'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent"
                          onClick={() => setUserMenuOpen(false)}>
                          <Settings className="h-4 w-4" />系统设置
                        </Link>
                        <button onClick={() => { setUserMenuOpen(false); setShowEnterpriseModal(true); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent w-full text-left">
                          <Building2 className="h-4 w-4" />创建企业账号
                        </button>
                        <button onClick={() => { setUserMenuOpen(false); logout(); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent w-full text-left text-destructive">
                          <LogOut className="h-4 w-4" />退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 创建企业账号弹窗 */}
        {showEnterpriseModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowEnterpriseModal(false)}>
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />创建企业账号
                </h2>
                <button onClick={() => setShowEnterpriseModal(false)} className="p-1 rounded hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 上传营业执照 */}
                <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 text-center transition-colors cursor-pointer"
                  onClick={() => document.getElementById('biz-license-upload')?.click()}>
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">上传营业执照</p>
                  <p className="text-xs text-muted-foreground mt-1">OCR自动识别企业信息</p>
                  <input id="biz-license-upload" type="file" accept="image/*" className="hidden" onChange={handleBizLicenseUpload} />
                </div>

                <div>
                  <Label className="text-sm">企业名称</Label>
                  <Input value={enterpriseName} onChange={(e) => setEnterpriseName(e.target.value)}
                    placeholder="输入企业全称" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">法定代表人</Label>
                  <Input value={legalPerson} onChange={(e) => setLegalPerson(e.target.value)}
                    placeholder="法定代表人姓名" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">有效期至</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowEnterpriseModal(false)}>取消</Button>
                <Button className="flex-1" onClick={handleCreateEnterprise} disabled={creatingEnterprise}>
                  {creatingEnterprise && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  确认创建
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="container py-6 px-4 md:px-8">{children}</div>
      </main>
    </div>
  );
}
