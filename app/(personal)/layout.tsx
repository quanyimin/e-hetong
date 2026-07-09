'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, FileText, BookOpenCheck, Bell, User, Camera, Upload, Inbox } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home', label: '首页', icon: Home, exact: true },
  { href: '/dashboard/contracts', label: '合同库', icon: FileText },
  { href: '/dashboard/ledger', label: '台账', icon: BookOpenCheck },
  { href: '/dashboard/reminders', label: '提醒', icon: Bell },
  { href: '/dashboard/settings', label: '我', icon: User },
];

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部快捷入口 */}
      <div className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-6">
            <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium">拍照上传</span>
            </button>
            <Link href="/dashboard/upload" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">文件上传</span>
            </Link>
            <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
              <Inbox className="h-6 w-6" />
              <span className="text-xs font-medium">邮箱导入</span>
            </button>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* 底部导航（5项） */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t max-w-lg mx-auto rounded-t-2xl shadow-lg">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors rounded-lg min-w-[60px]',
                  isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground')}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
