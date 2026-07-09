'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Bell, Settings, Upload, ChevronLeft, Gift, Folder, Search, Building2, BadgeCheck,
} from 'lucide-react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { TenantSwitcher } from '@/components/TenantSwitcher';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  distributorOnly?: boolean;
}

const ALL_ITEMS: SidebarItem[] = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/contracts', label: '合同管理', icon: FileText },
  { href: '/dashboard/folders', label: '合同分类', icon: Folder },
  { href: '/dashboard/upload', label: '上传合同', icon: Upload },
  { href: '/dashboard/assets', label: '资产管理', icon: Building2 },
  { href: '/dashboard/licenses', label: '证照管理', icon: BadgeCheck },
  { href: '/dashboard/reminders', label: '提醒管理', icon: Bell },
  { href: '/dashboard/distribution', label: '分销中心', icon: Gift, distributorOnly: true },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const isDev = process.env.NODE_ENV === 'development';

  const visibleItems = ALL_ITEMS.filter((item) => !item.distributorOnly || isDev);

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
            <div className="flex-1" />
            <GlobalSearch />
          </div>
        </div>
        <div className="container py-6 px-4 md:px-8">{children}</div>
      </main>
    </div>
  );
}
