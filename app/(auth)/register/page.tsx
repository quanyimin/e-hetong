'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Gift, Mail, Smartphone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getTierFromMemberLevel } from '@/lib/adaptive';

export default function RegisterPage() {
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPwd, setConfirmPwd] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [regType, setRegType] = React.useState<'email' | 'phone'>('email');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) setInviteCode(invite);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('请输入姓名'); return; }
    if (regType === 'email' && !email.trim()) { setError('请输入邮箱'); return; }
    if (regType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('邮箱格式不正确'); return; }
    if (regType === 'phone' && !/^1\d{10}$/.test(phone)) { setError('手机号格式不正确'); return; }
    if (!password || password.length < 6) { setError('密码至少6位'); return; }
    if (password !== confirmPwd) { setError('两次密码不一致'); return; }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: regType === 'email' ? email : undefined, phone: regType === 'phone' ? phone : undefined, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '注册失败');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('ehetong_user', JSON.stringify(data.user));
      setStep('success');
      // 新注册用户默认为 free 等级，跳转到个人版首页
      const tier = getTierFromMemberLevel(data.user?.memberLevel || 'free');
      const redirectPath = tier === 'personal' ? '/home' : '/dashboard';
      setTimeout(() => { window.location.href = redirectPath; }, 1500);
    } catch {
      setError('网络错误，请稍后重试');
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="shadow-xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">🎉 注册成功！</h2>
            <p className="text-muted-foreground">即将跳转到控制台...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="shadow-xl max-w-md w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2"><FileText className="h-8 w-8 text-primary" /><span className="text-2xl font-bold"><span className="text-primary">多多</span>合同管家</span></Link>
          </div>
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription>免费注册，即送5份合同额度</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
            <div className="flex border rounded-lg p-1">
              <button type="button" className={`flex-1 py-2 text-sm rounded-md ${regType === 'email' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => setRegType('email')}><Mail className="h-3.5 w-3.5 inline mr-1" />邮箱注册</button>
              <button type="button" className={`flex-1 py-2 text-sm rounded-md ${regType === 'phone' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => setRegType('phone')}><Smartphone className="h-3.5 w-3.5 inline mr-1" />手机注册</button>
            </div>
            <div><Label>姓名</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="您的姓名" required /></div>
            {regType === 'email' ? (
              <div><Label>邮箱</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" /></div>
            ) : (
              <div><Label>手机号</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="13800138000" /></div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><Label>密码</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位" /></div>
              <div><Label>确认密码</Label><Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="再次输入" /></div>
            </div>
            <div><Label className="text-xs flex items-center gap-1"><Gift className="h-3 w-3 text-primary" />邀请码（选填）</Label><Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="输入邀请码可得奖励" /></div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />注册中...</> : '免费注册'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">已有账号？<Link href="/login" className="text-primary font-medium hover:underline">立即登录</Link></p>
        </CardFooter>
      </Card>
    </div>
  );
}
