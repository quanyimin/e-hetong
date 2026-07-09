'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import {
  User, Mail, Crown, Bell, Shield, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Loader2, Check
} from 'lucide-react';
import { formatDate, formatAmount } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '永久',
    contractLimit: '20份',
    features: ['基础合同管理', '手动分类', '到期站内信提醒'],
    popular: false,
  },
  {
    id: 'pro_yearly',
    name: '年度会员',
    price: '¥99',
    period: '/年',
    contractLimit: '无限',
    features: ['无限合同', 'AI智能解析', '多格式上传', '合同导出', '到期邮件提醒', '数据看板', '高优客服'],
    popular: true,
    badge: '推荐',
    savings: '每天不到 ¥0.27',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [memberLevel, setMemberLevel] = React.useState<'free' | 'pro'>('free');
  const [memberExpireAt, setMemberExpireAt] = React.useState<Date | null>(null);
  const [contractCount, setContractCount] = React.useState(8);
  const contractLimit = 20;

  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState('pro_yearly');
  const [payLoading, setPayLoading] = React.useState(false);
  const [paySuccess, setPaySuccess] = React.useState(false);

  // 监听升级成功参数
  React.useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setMemberLevel('pro');
      setMemberExpireAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    }
  }, [searchParams]);

  const isExpired = memberExpireAt && new Date() > memberExpireAt;
  const usagePercent = Math.min((contractCount / contractLimit) * 100, 100);
  const isNearLimit = contractCount >= contractLimit * 0.8;
  const isOverLimit = contractCount >= contractLimit;

  const handleUpgrade = async () => {
    setPayLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setPayLoading(false);
    setPaySuccess(true);
    setTimeout(() => {
      setPaySuccess(false);
      setShowUpgradeModal(false);
      setMemberLevel('pro');
      setMemberExpireAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">个人中心</h1>
        <p className="text-muted-foreground mt-1">管理您的个人信息和会员服务</p>
      </div>

      {/* 会员信息 - 醒目展示 */}
      <Card className={`border-2 ${memberLevel === 'free' ? 'border-muted' : 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/10 dark:to-background'}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full ${memberLevel === 'pro' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'} flex items-center justify-center`}>
                <Crown className={`h-7 w-7 ${memberLevel === 'pro' ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {memberLevel === 'pro' ? '年度会员' : '免费版'}
                </h2>
                {memberLevel === 'pro' && memberExpireAt && !isExpired && (
                  <p className="text-sm text-muted-foreground">
                    到期时间：{formatDate(memberExpireAt, 'yyyy年MM月dd日')}
                    <span className="ml-1 text-amber-600 font-medium">
                      （还剩 {Math.ceil((memberExpireAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天）
                    </span>
                  </p>
                )}
                {memberLevel === 'free' && (
                  <p className="text-sm text-muted-foreground">
                    已使用 {contractCount}/{contractLimit} 份合同
                  </p>
                )}
              </div>
            </div>
            {memberLevel === 'free' && (
              <Button onClick={() => setShowUpgradeModal(true)} className="gap-1 shrink-0">
                <Sparkles className="h-4 w-4" />
                升级会员
              </Button>
            )}
          </div>

          {/* 合同用量进度条（免费版） */}
          {memberLevel === 'free' && (
            <div className="mt-4">
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${usagePercent}%` }} />
              </div>
              {isOverLimit && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />合同已达上限，请升级会员或删除旧合同
                </p>
              )}
            </div>
          )}

          {/* 会员权益标签 */}
          {memberLevel === 'pro' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['无限合同', 'AI智能解析', '合同导出', '邮件提醒', '高优客服'].map((f) => (
                <Badge key={f} variant="secondary" className="bg-amber-100/50 dark:bg-amber-900/20 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />{f}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>姓名</Label><Input defaultValue="张经理" /></div>
          <div className="space-y-2"><Label>邮箱</Label><Input defaultValue="zhang@e-hetong.com" /></div>
          <div className="space-y-2"><Label>手机号</Label><Input placeholder="绑定手机号可接收短信提醒" /></div>
          <Button variant="outline">保存修改</Button>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />通知设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">站内信通知</p><p className="text-sm text-muted-foreground">登录后在站内接收提醒</p></div>
            <Badge variant="success">已开启</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">邮件通知</p>
              <p className="text-sm text-muted-foreground">{memberLevel === 'free' ? '升级年度会员可用' : '通过邮箱接收到期提醒'}</p>
            </div>
            {memberLevel === 'free' ? (
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setShowUpgradeModal(true)}>升级解锁</Button>
            ) : (
              <Badge variant="success">已开启</Badge>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium">微信通知</p><p className="text-sm text-muted-foreground">通过公众号接收提醒</p></div>
            <Badge variant="secondary">未绑定</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 升级弹窗 */}
      <Modal open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <ModalContent className="max-w-lg">
          <ModalHeader><ModalTitle>选择升级方案</ModalTitle></ModalHeader>
          <div className="p-6">
            {paySuccess ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">🎉 升级成功！</h3>
                <p className="text-muted-foreground">您已是年度会员，所有功能已解锁</p>
              </div>
            ) : (
              <div className="space-y-4">
                {PLANS.filter((p) => p.id !== 'free').map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.badge && (
                      <div className="absolute -top-2.5 right-4">
                        <Badge className="bg-gradient-to-r from-primary to-purple-500">{plan.badge}</Badge>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.contractLimit}合同 · 无限AI解析</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{plan.price}</p>
                        <p className="text-xs text-muted-foreground">{plan.period}</p>
                      </div>
                    </div>
                    {plan.savings && <p className="text-xs text-primary mt-1">{plan.savings}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.features.map((f) => (
                        <span key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="bg-amber-50 dark:bg-amber-950/10 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>支付功能开发中，当前为演示模式。点击下方按钮模拟升级成功。</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowUpgradeModal(false)}>取消</Button>
                  <Button className="flex-1" onClick={handleUpgrade} loading={payLoading}>
                    {payLoading ? '处理中...' : `升级 ${PLANS.find((p) => p.id === selectedPlan)?.name || ''}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
