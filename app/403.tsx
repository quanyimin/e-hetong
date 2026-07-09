import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-destructive/10 mb-6">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">403</h1>
        <h2 className="text-xl font-semibold mb-2">拒绝访问</h2>
        <p className="text-muted-foreground mb-8">
          抱歉，您没有权限访问此页面。该区域仅限管理员访问。
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回控制台
            </Button>
          </Link>
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              回到首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
