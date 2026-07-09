'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('页面错误:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">出错了</h1>
          <p className="text-muted-foreground mt-2">
            抱歉，页面出现了意外错误。请稍后重试。
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-muted-foreground mt-4 bg-muted p-3 rounded-md text-left overflow-auto">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline">
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
