'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Brain,
  Bell,
  Shield,
  Upload,
  Search,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Upload,
    title: '多格式上传',
    description: '支持 PDF、Word、图片等多种合同文件格式，一键上传自动归档。',
  },
  {
    icon: Brain,
    title: 'AI 智能解析',
    description: '自动提取合同关键信息，包括甲乙双方、金额、期限、核心条款等。',
  },
  {
    icon: Search,
    title: '智能检索',
    description: '全文搜索、按类型/日期/金额等多维度筛选，快速找到目标合同。',
  },
  {
    icon: Bell,
    title: '到期提醒',
    description: '合同到期自动提醒，支持微信/邮件/站内信多渠道通知，避免遗漏。',
  },
  {
    icon: BarChart3,
    title: '数据看板',
    description: '合同数据可视化分析，合同数量趋势、类型分布一目了然。',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '数据加密传输存储，基于 Supabase 的企业级安全防护。',
  },
];

const PRICING_PLANS = [
  {
    name: '免费版',
    price: '0',
    period: '永久免费',
    description: '适合个人或试用',
    features: ['最多 10 份合同', '基础合同解析', '到期提醒', '基础检索'],
    cta: '免费使用',
    popular: false,
  },
  {
    name: '专业版',
    price: '49',
    period: '/月',
    description: '适合小微企业',
    features: ['最多 100 份合同', 'AI 智能解析（50次/月）', '多格式上传', '到期提醒', '数据看板'],
    cta: '立即开通',
    popular: true,
  },
  {
    name: '企业版',
    price: '199',
    period: '/月',
    description: '适合高需求企业',
    features: [
      '最多 1000 份合同',
      'AI 智能解析（500次/月）',
      '多格式上传',
      '到期提醒',
      '数据看板',
      '专属客服',
    ],
    cta: '联系客服',
    popular: false,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero 区域 */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-muted mb-6">
              🎉 全新发布 &middot; AI 驱动合同管理
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              让合同管理
              <span className="block text-primary mt-2">更智能、更高效</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              多多合同管家利用 AI 技术，为小微企业提供合同上传、智能解析、分类归档、到期提醒一站式服务，
              让您从繁琐的合同管理工作中解放出来。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="xl" className="w-48">
                  免费开始使用
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="xl" className="w-48">
                  了解更多
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                无需信用卡
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                7 天免费试用
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                随时取消
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              强大功能，简单操作
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              覆盖合同管理全流程，让每一份合同都井井有条
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 定价方案 */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              简单透明的定价
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              选择适合您业务规模的方案，随时升级或降级
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-lg shadow-primary/10 scale-105'
                    : 'hover:shadow-md'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      最受欢迎
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">¥{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-8"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                立即开始管理您的合同
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
                注册即享 7 天免费体验，无需绑定支付方式
              </p>
              <div className="mt-8">
                <Link href="/register">
                  <Button
                    size="xl"
                    variant="secondary"
                    className="w-48 bg-white text-primary hover:bg-white/90"
                  >
                    免费注册
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
