'use client';

import * as React from 'react';
import { AuthProvider } from '@/lib/auth-context';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * 全局 Provider 组件
 * 提供认证（Auth）、主题等上下文
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
