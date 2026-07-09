'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <p className="text-xl text-muted-foreground mt-2">页面未找到</p>
          <p className="text-sm text-muted-foreground mt-1">
            您访问的页面不存在或已被移除
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button>
              前往控制台
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
