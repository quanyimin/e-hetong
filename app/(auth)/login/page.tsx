'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, AlertCircle, Smartphone, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [loginType, setLoginType] = React.useState<'email' | 'phone'>('email');
  const [account, setAccount] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && typeof window !== 'undefined') {
      const userStorage = localStorage.getItem('ehetong_auth');
      if (userStorage) {
        try {
          const user = JSON.parse(userStorage);
          if (user?.id) {
            router.push('/dashboard');
          }
        } catch {}
      }
    }
  }, [authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account.trim()) { setError('请输入账号'); return; }
    if (!password) { setError('请输入密码'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    if (loginType === 'email' && !/\S+@\S+\.\S+/.test(account)) { setError('邮箱格式不正确'); return; }
    if (loginType === 'phone' && !/^1\d{10}$/.test(account)) { setError('手机号格式不正确'); return; }

    setIsLoading(true);

    const result = await login(account, password);
    if (!result.success) {
      setError(result.error || '登录失败');
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold"><span className="text-primary">多多</span>合同管家</span>
          </Link>
        </div>
        <CardTitle className="text-2xl">欢迎回来</CardTitle>
        <CardDescription>登录您的多多合同管家账号</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex border rounded-lg p-1 mb-4">
          <button type="button"
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${loginType === 'email' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setLoginType('email'); setError(null); }}>
            <Mail className="h-3.5 w-3.5 inline mr-1" />邮箱登录
          </button>
          <button type="button"
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${loginType === 'phone' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setLoginType('phone'); setError(null); }}>
            <Smartphone className="h-3.5 w-3.5 inline mr-1" />手机号登录
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>{loginType === 'email' ? '邮箱地址' : '手机号'}</Label>
            <Input type={loginType === 'email' ? 'email' : 'tel'}
              placeholder={loginType === 'email' ? 'your@email.com' : '13800000002'}
              value={account} onChange={(e) => setAccount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading || authLoading}>
            {isLoading || authLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />验证中...</> : '登录'}
          </Button>
        </form>

      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          还没有账号？<Link href="/register" className="text-primary font-medium hover:underline">立即注册</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
