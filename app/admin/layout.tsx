'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Shield,
  Users,
  FileText,
  BarChart3,
  Settings,
  CreditCard,
  ArrowLeft,
  Gift,
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin', label: '总览', icon: BarChart3, exact: true },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/contracts', label: '合同管理', icon: FileText },
  { href: '/admin/orders', label: '订单管理', icon: CreditCard },
  { href: '/admin/distribution', label: '分销管理', icon: Gift },
  { href: '/admin/settings', label: '系统设置', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* 管理后台顶部栏 */}
      <div className="border-b bg-amber-50/50 dark:bg-amber-950/10">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回控制台
            </Link>
            <span className="text-sm text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">管理后台</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">仅管理员可见</span>
        </div>
      </div>

      <div className="flex">
        {/* 管理侧边栏 */}
        <aside className="w-56 border-r bg-muted/10 hidden md:block shrink-0">
          <nav className="p-3 space-y-1">
            {ADMIN_NAV.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
