'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, HelpCircle } from 'lucide-react';

const PLANS = [
  {
    name: '免费版',
    price: '0',
    period: '永久免费',
    description: '适合个人试用',
    features: [
      '最多 10 份合同',
      '基础合同信息录入',
      '手动标签分类',
      '到期邮件提醒',
      '基础搜索',
    ],
    limits: ['不支持 AI 解析', '不支持多格式上传', '无数据看板'],
    cta: '免费使用',
    popular: false,
  },
  {
    name: '专业版',
    price: '49',
    period: '/月',
    yearlyPrice: '¥499/年 (省 2 个月)',
    description: '适合小微企业',
    features: [
      '最多 100 份合同',
      'AI 智能解析 (50次/月)',
      'PDF/Word/图片多格式上传',
      '智能分类归档',
      '到期提醒 (邮件+站内信)',
      '数据看板',
      '全文检索',
    ],
    limits: [],
    cta: '立即订阅',
    popular: true,
  },
  {
    name: '企业版',
    price: '199',
    period: '/月',
    yearlyPrice: '¥1,999/年 (省 2 个月)',
    description: '适合高需求企业',
    features: [
      '最多 1000 份合同',
      'AI 智能解析 (500次/月)',
      'PDF/Word/图片多格式上传',
      '智能分类归档',
      '到期提醒 (邮件+站内信+微信)',
      '高级数据看板',
      '全文检索',
      '专属客服支持',
      'API 接口',
    ],
    limits: [],
    cta: '联系客服',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            定价方案
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            选择适合您的方案
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            灵活的定价，满足不同规模企业的合同管理需求。所有方案均含 7 天免费试用。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${
                plan.popular
                  ? 'border-primary shadow-xl shadow-primary/10 scale-105'
                  : 'hover:shadow-lg'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="px-4 py-1 text-sm">最受欢迎</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">¥{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                  {plan.yearlyPrice && (
                    <p className="text-sm text-primary font-medium mt-2">
                      {plan.yearlyPrice}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limits.map((limit) => (
                    <li key={limit} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="h-5 w-5 shrink-0 flex items-center justify-center">
                        <span className="text-muted-foreground">-</span>
                      </span>
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {plan.name === '免费版' ? (
                    <Link href="/register">
                      <Button variant="outline" className="w-full" size="lg">
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : plan.name === '企业版' ? (
                    <Button className="w-full" size="lg" variant="outline">
                      {plan.cta}
                    </Button>
                  ) : (
                    <Link href="/register">
                      <Button className="w-full" size="lg">
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">常见问题</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: '可以随时升级或降级方案吗？',
                a: '是的，您可以随时在账号设置中更改方案，系统会自动按比例计算费用。',
              },
              {
                q: '免费版有功能限制吗？',
                a: '免费版最多管理 10 份合同，不支持 AI 智能解析和多格式上传。适合个人用户体验。',
              },
              {
                q: 'AI 解析的准确性如何？',
                a: '我们的 AI 模型针对合同场景进行了专项训练，关键信息提取准确率超过 95%。但建议您对解析结果进行人工复核。',
              },
              {
                q: '数据安全如何保障？',
                a: '所有数据采用加密传输和存储，使用 Supabase 企业级基础设施，通过 SOC2 认证。',
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="font-medium flex items-start gap-2">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground ml-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
