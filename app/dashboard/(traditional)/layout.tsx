'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Bell, Settings, Building2, BadgeCheck,
  Store, LogOut, Sparkles, Loader2, X, User, Shield,
  Home, Users, MessageSquare, BarChart3, Grid, PenTool,
  ClipboardList, CreditCard, FileSpreadsheet, Globe, Mail,
  Key, Fingerprint, BookOpen, HelpCircle, ChevronRight, ChevronDown,
  Upload, Layers, Wand2, ArrowDownLeft, ArrowUpRight, ArrowRight,
  Puzzle, Share2, Scan, Monitor, GitBranch, PlusCircle, Wrench,
  Bot, Database, ShieldCheck, ShoppingCart, Stamp, HardDrive, FileSignature,
  Calendar, Grid3X3, Activity, Info, Edit3, Inbox, Wallet,
  Moon, Sun,
} from 'lucide-react';
import { MANAGEMENT_SUBGROUPS } from '@/lib/menu-config';
import { useAuth } from '@/lib/auth-context';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import AiChat from '@/app/dashboard/_components/AiChat';
import { ModeToggle } from '@/components/mode-toggle';
import { useMode } from '@/lib/mode-context';
import {
  MENU_CONFIG, MENU_GROUP, GROUP_ORDER, GROUP_LABELS,
  filterMenusByScenes, filterMenusByPlan,
  PLAN_LEVELS, SCENE,
  type MenuItem, type MenuGroupKey,
} from '@/lib/menu-config';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, FileText, BookOpen, Upload, Bell, Folder: Wrench,
  Home, Building2, Gauge: BarChart3, Safe: Shield, User, Key,
  UtensilsCrossed: Store, Truck: Store, BadgeCheck, Calendar,
  Briefcase: ClipboardList, FileType: FileText,
  Smartphone: Monitor, Shield, CreditCard, Settings,
  List: FileText, Layers, Stamp, Store,
  ArrowDownLeft, ArrowUpRight,
  Users, BarChart3, Building: Building2, CheckSquare: ClipboardList,
  Wallet, PlusCircle, DollarSign: CreditCard,
  Wand2, PenTool, Mail, Inbox, Sparkles,
  Globe, Puzzle, MessageSquare, Share2, Scan, Monitor,
  GitBranch, FileSpreadsheet, ShieldCheck,
  Bot, Database, HardDrive, FileSignature,
  Grid3X3, Activity, Info, ClipboardList,
  Edit3,
};

function getIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || FileText;
}

function MobileNavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1 text-xs font-medium transition-colors',
        active ? 'text-blue-600' : 'text-slate-500'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function TopNavDropdown({ item, pathname }: { item: MenuItem; pathname: string }) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = hasChildren
    ? item.path === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(item.path) || (item.children?.some(c => pathname?.startsWith(c.path)) ?? false)
    : item.path === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(item.path);
  const Icon = getIcon(item.icon);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 检查是否有 subGroup 分组（必须在 early return 之前调用 hooks）
  const hasSubGroups = item.children?.some(c => c.subGroup);
  // 按 subGroup 分组
  const groupedChildren = React.useMemo(() => {
    if (!hasSubGroups || !item.children) return null;
    const groups: Record<string, MenuItem[]> = {};
    item.children.forEach(child => {
      const sg = child.subGroup || 'OTHER';
      if (!groups[sg]) groups[sg] = [];
      groups[sg].push(child);
    });
    return groups;
  }, [item.children, hasSubGroups]);

  if (!hasChildren) {
    return (
      <Link
        href={item.path}
        className={cn(
          'flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'text-blue-600 bg-blue-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{item.label}</span>
        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium">{item.badge}</span>
        )}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={item.path}
        className={cn(
          'flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'text-blue-600 bg-blue-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{item.label}</span>
        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium">{item.badge}</span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform hidden lg:block', open && 'rotate-180')} />
      </Link>
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 pt-1.5 z-50',
          )}
        >
        <div
          className={cn(
            'bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 overflow-hidden',
            hasSubGroups ? 'w-72 max-h-[80vh] overflow-y-auto' : 'w-56'
          )}
        >
          {groupedChildren ? (
            /* 分组式下拉（管理菜单） */
            Object.entries(groupedChildren).map(([sgKey, items]) => (
              <div key={sgKey}>
                <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {MANAGEMENT_SUBGROUPS[sgKey] || sgKey}
                </div>
                {items.map(child => {
                  const ChildIcon = getIcon(child.icon);
                  const childActive = pathname?.startsWith(child.path);
                  return (
                    <Link
                      key={child.key}
                      href={child.path}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors',
                        childActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <ChildIcon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{child.label}</span>
                      {child.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">{child.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          ) : (
            /* 普通下拉 */
            item.children?.map(child => {
              const ChildIcon = getIcon(child.icon);
              const childActive = pathname?.startsWith(child.path);
              return (
                <Link
                  key={child.key}
                  href={child.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors',
                    childActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{child.label}</span>
                  {child.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">{child.badge}</span>
                  )}
                </Link>
              );
            })
          )}
        </div>
        </div>
      )}
    </div>
  );
}

export default function TraditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, user, logout, tenantList, switchTenant } = useAuth();
  const { mode, toggleMode } = useMode();

  React.useEffect(() => {
    document.body.classList.add('is-dashboard');
    document.documentElement.classList.add('is-dashboard');
    return () => {
      document.body.classList.remove('is-dashboard');
      document.documentElement.classList.remove('is-dashboard');
    };
  }, []);

  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const userMenuBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) &&
          userMenuBtnRef.current && !userMenuBtnRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showEnterpriseModal, setShowEnterpriseModal] = React.useState(false);
  const [enterpriseName, setEnterpriseName] = React.useState('');
  const [legalPerson, setLegalPerson] = React.useState('');
  const [validUntil, setValidUntil] = React.useState('');
  const [creatingEnterprise, setCreatingEnterprise] = React.useState(false);

  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
  const [mobileEsignOpen, setMobileEsignOpen] = React.useState(false);

  // P2-8: 暗色模式基础支持
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // 读取 localStorage 中的主题偏好
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // P2-11: 企业/个人空间切换器 SpaceSwitcher
  const [spaceMenuOpen, setSpaceMenuOpen] = React.useState(false);
  const spaceRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (spaceRef.current && !spaceRef.current.contains(event.target as Node)) {
        setSpaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 空间切换：复用 useAuth 的 switchTenant 进行 PERSONAL / ENTERPRISE 场景切换
  const switchSpace = (tenantId: string) => {
    switchTenant(tenantId);
    setSpaceMenuOpen(false);
  };

  const isAdmin = user?.role === 'admin';
  const isEnterprise = tenant?.sceneType === 'ENTERPRISE';

  const topNavMenus = React.useMemo(() => {
    const planLevel = tenant?.plan ? (PLAN_LEVELS[tenant.plan as keyof typeof PLAN_LEVELS] ?? 0) : 0;
    const enabledScenes: string[] = [];
    const sceneType = tenant?.sceneType;
    if (sceneType === 'LANDLORD') enabledScenes.push(SCENE.LANDLORD);
    if (sceneType === 'CATERING' || sceneType === 'RESTAURANT') {
      enabledScenes.push(SCENE.RESTAURANT_SUPPLIER, SCENE.RESTAURANT_PLAN);
    }
    let menus = filterMenusByPlan(MENU_CONFIG, planLevel);
    menus = filterMenusByScenes(menus, enabledScenes);
    if (!isAdmin) {
      menus = menus.filter(m => !m.adminOnly);
    }
    // 显示主导航 + 行业应用（如果有启用的场景）
    return menus.filter(m => m.group === MENU_GROUP.MAIN || (m.group === MENU_GROUP.BUSINESS && enabledScenes.length > 0));
  }, [tenant, isAdmin]);

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

  const handleBizLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/ocr/business-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.fields) {
            const f = data.fields;
            setEnterpriseName(f.companyName || f.单位名称 || '');
            setLegalPerson(f.legalPerson || f.法人代表 || f.法定代表人 || '');
            if (f.validityPeriod || f.有效期) {
              const dateStr = f.validityPeriod || f.有效期;
              const match = dateStr.match(/\d{4}[-年]\d{1,2}[-月]\d{1,2}/);
              if (match) setValidUntil(match[0].replace(/年/g, '-').replace(/月/g, '-'));
            }
            toast.success('营业执照识别成功');
          }
        }
      } catch {
        toast.error('营业执照识别失败，请手动填写');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* ==================== 顶部导航栏 ==================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-100 dark:bg-slate-900 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-16 gap-2">
          {/* 左侧：Logo + 导航菜单 */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0 overflow-x-auto scrollbar-hide">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-800 hidden sm:inline">多多合同助手</span>
            </Link>

            {/* 顶部导航菜单（所有屏幕宽度始终显示） */}
            <nav className="flex items-center gap-0.5 shrink-0">
              {topNavMenus.map(item => (
                <TopNavDropdown key={item.key} item={item} pathname={pathname ?? ''} />
              ))}
            </nav>

            {/* P2-11: 空间切换器 SpaceSwitcher - 企业/个人空间切换 */}
            <div className="relative shrink-0 hidden md:block" ref={spaceRef}>
              <button
                onClick={() => setSpaceMenuOpen(!spaceMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                {tenant?.sceneType === 'PERSONAL' ? <Home className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                <span className="hidden lg:inline max-w-[120px] truncate">{tenant?.tenantName || '个人空间'}</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', spaceMenuOpen && 'rotate-180')} />
              </button>
              {spaceMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 z-50">
                  <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">空间切换</div>
                  {tenantList?.map(t => (
                    <button
                      key={t.tenantId}
                      onClick={() => switchSpace(t.tenantId)}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 text-sm w-full text-left transition-colors',
                        tenant?.tenantId === t.tenantId
                          ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      )}
                    >
                      {t.sceneType === 'PERSONAL' ? <Home className="h-4 w-4 shrink-0" /> : <Building2 className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate">{t.tenantName}</span>
                      {tenant?.tenantId === t.tenantId && <span className="text-xs text-blue-600">当前</span>}
                    </button>
                  ))}
                  {(!tenantList || tenantList.length === 0) && (
                    <div className="px-3.5 py-2.5 text-sm text-slate-400">暂无其他空间</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：搜索 + 操作 + 用户（始终可见，不收缩） */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 搜索框（桌面端） */}
            <div className="hidden xl:block w-64">
              <GlobalSearch />
            </div>

            {/* 关于我们 */}
            <Link
              href="/about"
              className="hidden sm:flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
            >
              <Info className="h-4 w-4" />
              <span className="hidden lg:inline">关于</span>
            </Link>

            {/* P2-8: 暗色模式切换 ThemeToggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
              title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* 模式切换 - 始终可见 */}
            <ModeToggle />

            {/* 用户头像 */}
            <button
              ref={userMenuBtnRef as any}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-50 transition-colors shrink-0"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-medium text-white shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </button>

            {userMenuOpen && (
              <div
                ref={userMenuRef as any}
                className="absolute right-4 top-14 z-50 w-72 rounded-2xl border border-slate-100 bg-white p-1 shadow-xl"
              >
                {/* 用户信息卡 */}
                <div className="px-3 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-semibold text-white shadow-md shadow-blue-500/20">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || user?.phone || ''}</p>
                    </div>
                    {isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-medium shrink-0">管理员</span>
                    )}
                  </div>
                  {tenant && (
                    <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50">
                      {tenant.sceneType === 'PERSONAL' ? <Home className="h-3.5 w-3.5 text-slate-400" /> :
                       tenant.sceneType === 'INDIVIDUAL' ? <Store className="h-3.5 w-3.5 text-slate-400" /> :
                       <Building2 className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="text-xs text-slate-600 truncate flex-1">{tenant.tenantName}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* 快捷入口 */}
                <div className="py-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium">个人设置</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                  <Link
                    href="/dashboard/tenants"
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium">主体管理</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium">订单中心</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                  <Link
                    href="/about"
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 transition-colors md:hidden"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500">
                      <Info className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium">关于我们</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </div>

                {isAdmin && (
                  <div className="py-2 border-t border-slate-100">
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="flex-1 font-medium">管理后台</span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </Link>
                  </div>
                )}

                <div className="py-2 border-t border-slate-100">
                  <button
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-indigo-50 text-indigo-600 transition-colors"
                    onClick={() => { toggleMode(); setUserMenuOpen(false); }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                      {mode === 'traditional' ? <Sparkles className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                    </div>
                    <span className="flex-1 font-medium text-left">
                      {mode === 'traditional' ? '切换到 AI 模式' : '切换到传统模式'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                  <button
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm rounded-xl hover:bg-rose-50 text-rose-600 transition-colors"
                    onClick={logout}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="flex-1 font-medium text-left">退出登录</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* ==================== 发起合同弹窗（移动端） ==================== */}
      {mobileEsignOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMobileEsignOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 mt-2" />
            <div className="px-6 mb-4">
              <h2 className="text-lg font-semibold text-slate-800 text-center">发起合同</h2>
              <p className="text-sm text-slate-500 text-center mt-1">选择发起方式</p>
            </div>
            <div className="px-6 space-y-3">
              <Link href="/dashboard/upload?from=mobile&purpose=sign" onClick={() => setMobileEsignOpen(false)} className="block bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">上传文件发起</h3>
                  <p className="text-xs text-blue-100">拖拽或选择本地文件</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </Link>
              <Link href="/dashboard/templates" onClick={() => setMobileEsignOpen(false)} className="block bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">模板发起</h3>
                  <p className="text-xs text-indigo-100">从模板库选择合同模板</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </Link>
              <Link href="/dashboard/contracts/generate?from=mobile" onClick={() => setMobileEsignOpen(false)} className="block bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wand2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">AI生成合同</h3>
                  <p className="text-xs text-violet-100">输入需求，AI帮您生成</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </Link>
            </div>
            <div className="px-6 mt-4">
              <button onClick={() => setMobileEsignOpen(false)} className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 更多底部抽屉（移动端） ==================== */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMobileMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full bg-slate-50 rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 mt-2" />

            {/* 用户信息卡 */}
            <div className="px-4 mb-3">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 text-white relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold">
                    {user?.name?.[0] || user?.email?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{user?.name || '用户'}</p>
                      {isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/90 text-amber-900 font-medium">管理员</span>
                      )}
                    </div>
                    <p className="text-xs text-blue-100/80 mt-0.5 truncate">{tenant?.tenantName || ''}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium">
                        {user?.memberLevel === 'free' ? '免费版' : user?.memberLevel || '免费版'}
                      </span>
                      <Link href="/dashboard/settings" onClick={() => setMobileMoreOpen(false)} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium hover:bg-white/30 transition-colors">
                        升级 →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="px-4 mb-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 mb-3">快捷操作</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { path: '/dashboard/ai-review', label: 'AI审查', icon: ShieldCheck, color: 'from-purple-500 to-pink-500' },
                    { path: '/dashboard/assets', label: '资产管理', icon: Database, color: 'from-cyan-500 to-blue-500' },
                    { path: '/dashboard/licenses', label: '证照管理', icon: BadgeCheck, color: 'from-amber-500 to-orange-500' },
                    { path: '/dashboard/plugins', label: '插件市场', icon: Puzzle, color: 'from-emerald-500 to-teal-500' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} href={item.path} onClick={() => setMobileMoreOpen(false)} className="flex flex-col items-center gap-1.5">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md shadow-blue-500/20`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[11px] text-slate-700 font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 功能分组列表 */}
            <div className="px-4 space-y-3">
              {(() => {
                const mineMenu = MENU_CONFIG.find(m => m.key === 'management');
                if (!mineMenu?.children) return null;
                const filteredChildren = filterMenusByPlan(mineMenu.children, user?.memberLevel ? PLAN_LEVELS[user.memberLevel] : 0);
                return filteredChildren.filter(item => item.path).map(item => {
                  const Icon = getIcon(item.icon);
                  const isActive = pathname?.startsWith(item.path);
                  return (
                    <Link
                      key={item.key}
                      href={item.path}
                      onClick={() => setMobileMoreOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white transition-colors hover:bg-slate-50"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium flex-1 text-slate-700">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{item.badge}</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </Link>
                  );
                });
              })()}

              {/* 关于我们 */}
              <Link
                href="/about"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white transition-colors hover:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                  <Info className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium flex-1 text-slate-700">关于我们</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>

              {/* 退出登录 */}
              <button onClick={() => { setMobileMoreOpen(false); logout(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 w-full text-left transition-colors">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium flex-1">退出登录</span>
              </button>

              {/* 版本信息 */}
              <div className="text-center py-2">
                <p className="text-[11px] text-slate-400">多多合同助手 v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 主内容区 ==================== */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
          {children}
        </div>
      </main>
      <AiChat />
      {/* ==================== Cmd+K 全局命令面板 ==================== */}
      <CommandPalette />
    </div>
  );
}
