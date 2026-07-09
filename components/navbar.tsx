'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Menu,
  X,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield,
  Crown,
  Gift,
  Loader2,
} from 'lucide-react';
import { TenantSwitcher } from '@/components/TenantSwitcher';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/pricing', label: '定价' },
  { href: '/dashboard', label: '控制台' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, isAdmin, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">多多</span>合同管家
          </span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 用户操作区 */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isLoggedIn && user ? (
            <>
            <TenantSwitcher />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full p-1.5 hover:bg-accent transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {user.memberLevel === 'pro' ? '年度会员' : '免费版'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-md border bg-popover p-1 shadow-md">
                    <div className="px-2 py-2 border-b">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email || user.phone || ''}</p>
                      <div className="mt-1 flex items-center gap-1">
                        {user.memberLevel === 'pro' ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Crown className="h-3 w-3" />年度会员
                          </span>
                        ) : (
                          <Link href="/pricing" className="text-xs text-primary hover:underline" onClick={() => setUserMenuOpen(false)}>
                            升级年度会员
                          </Link>
                        )}
                      </div>
                    </div>

                    <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent mt-1" onClick={() => setUserMenuOpen(false)}>
                      <FileText className="h-4 w-4" />控制台
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                      <Settings className="h-4 w-4" />个人设置
                    </Link>
                    <Link href="/dashboard/distribution" className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                      <Gift className="h-4 w-4" />分销中心
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent" onClick={() => setUserMenuOpen(false)}>
                        <Shield className="h-4 w-4" />管理后台
                      </Link>
                    )}

                    <div className="border-t mt-1 pt-1">
                      <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-destructive" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />退出登录
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">免费注册</Button>
              </Link>
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="菜单">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn('block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                {item.label}
              </Link>
            ))}
            {isLoggedIn && (
              <>
                <Link href="/dashboard/settings" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent">个人设置</Link>
                <Link href="/dashboard/distribution" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent">分销中心</Link>
                {isAdmin && <Link href="/admin" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent">管理后台</Link>}
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10">退出登录</button>
              </>
            )}
            {!isLoggedIn && (
              <div className="flex gap-2 pt-2 border-t">
                <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">登录</Button></Link>
                <Link href="/register" className="flex-1"><Button className="w-full">免费注册</Button></Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
