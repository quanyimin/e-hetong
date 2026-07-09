'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, HelpCircle, Zap, Building2, User } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: '个人版',
    price: '0',
    period: '永久免费',
    description: '个人极简工具，拍照上传即用',
    icon: User,
    features: [
      '最多 50 份合同',
      '拍照上传 / OCR 识别',
      'AI 智能解析 (30次/月)',
      '自动分类归档',
      '到期提醒（站内信）',
      '基础模糊搜索',
      '单个个人主体',
    ],
    cta: '免费使用',
    popular: false,
    highlight: '适合个人 · 自由职业 · 房东',
  },
  {
    id: 'sme',
    name: 'SME 专业版',
    price: '1,800',
    period: '/年起',
    description: '行业经营工具，合同+钱+资产全闭环',
    icon: Zap,
    features: [
      '合同数量不限',
      'AI 智能解析 (500次/月)',
      'AI 自动归类 + 风险检测',
      '收支台账自动生成',
      '合作方档案管理',
      '资产 + 证照联动管理',
      '最多 2 个经营主体',
      '支持 2 个行业插件',
      '全局快捷键搜索 (Cmd+K)',
      '团队协作 (最多5人)',
    ],
    industryPlugins: [
      { name: '房东物业', price: '¥2,000/年' },
      { name: '餐饮门店', price: '¥2,000/年' },
      { name: '科技互联网', price: '¥3,800/年' },
      { name: '贸易零售', price: '¥3,800/年' },
      { name: '建筑工程', price: '¥4,800/年' },
    ],
    cta: '立即订阅',
    popular: true,
    highlight: '适合小微企业 · 个体户 · 多门店',
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: '58,000',
    period: '/年起',
    description: '集团管控平台，全功能 + 私有化部署',
    icon: Building2,
    features: [
      '全部 SME 版功能',
      'AI 解析不限次数',
      'AI 语义自然语言搜索',
      'AI 经营诊断分析',
      'AI 智能合同生成',
      '多级组织架构（集团-公司-部门）',
      '自定义审批流程',
      '电子印章 + 用印记录',
      '完整操作审计日志',
      'OpenAPI + Webhook',
      '团队不限人数',
      '经营主体不限数量',
      '全部行业插件免费使用',
      '私有化部署 / 专有云',
      '专属客户成功经理',
    ],
    cta: '联系商务',
    popular: false,
    highlight: '适合中大型企业 · 集团管控',
  },
];

const FAQ = [
  {
    q: '个人版和企业版的数据是隔离的吗？',
    a: '是的。所有主体的数据完全隔离，您在个人空间的数据对 SME 主体不可见，反之亦然。一个账号可管理多个主体，一键切换。',
  },
  {
    q: 'SME 版可以追加行业插件吗？',
    a: '可以。SME 版基础套餐含 2 个行业插件配额，如需更多可按需购买，每个 ¥2,000-¥9,800/年。插件可随时启用/停用。',
  },
  {
    q: '企业版支持私有化部署吗？',
    a: '支持。企业版客户可选择公有云 SaaS 或私有化部署（本地服务器/专有云），数据完全自主可控。私有化部署额外包含运维支持。',
  },
  {
    q: 'AI 解析准确率如何？',
    a: '针对 10 大行业合同场景专项训练，关键字段提取准确率超过 95%（金额、日期、双方名称等）。同时支持手动校对修正。',
  },
  {
    q: '如何升级或降级方案？',
    a: '随时在设置中操作，系统自动按剩余天数比例计算差价。升级即时生效，降级下个账期生效。',
  },
  {
    q: '数据安全和备份如何保障？',
    a: '所有数据 AES-256 加密传输与存储，每日自动备份，多区域容灾。企业版可选专属数据库实例。',
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            三层定价 · 按需选择
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            适合每个阶段的合同管理方案
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            从个人极简工具到集团企业管控，一套系统覆盖全场景。
            所有付费方案均含 <strong>14 天免费试用</strong>，无需信用卡。
          </p>
        </div>

        {/* 三层定价卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.popular
                    ? 'border-primary shadow-xl shadow-primary/10 md:scale-105'
                    : 'hover:shadow-lg'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="px-4 py-1 text-sm bg-primary">最受欢迎</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-medium text-primary">
                    {plan.highlight}
                  </CardDescription>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">¥{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                    {plan.id === 'free' && (
                      <p className="text-xs text-muted-foreground mt-1">无需付费，注册即用</p>
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
                  </ul>

                  {/* 行业插件价格展示（仅 SME） */}
                  {plan.industryPlugins && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-medium mb-3">可选行业插件（按需订阅）</p>
                      <div className="space-y-2">
                        {plan.industryPlugins.map((plugin) => (
                          <div key={plugin.name} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{plugin.name}</span>
                            <span className="font-medium">{plugin.price}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        行业插件可随时启用/停用，按年付费
                      </p>
                    </div>
                  )}

                  <div className="mt-8">
                    {plan.id === 'free' ? (
                      <Link href="/register">
                        <Button variant="outline" className="w-full" size="lg">
                          {plan.cta}
                        </Button>
                      </Link>
                    ) : plan.id === 'enterprise' ? (
                      <Button className="w-full" size="lg" variant="outline" asChild>
                        <a href="mailto:business@duoduoht.com">{plan.cta}</a>
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
            );
          })}
        </div>

        {/* 功能对比表 */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">完整功能对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4">功能模块</th>
                  <th className="text-center py-3 px-4">个人版</th>
                  <th className="text-center py-3 px-4 bg-primary/5">SME 专业版</th>
                  <th className="text-center py-3 px-4">企业版</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['合同上传/OCR/AI解析', '30次/月', '500次/月', '不限次'],
                  ['AI 自动归类', '✅', '✅', '✅'],
                  ['AI 风险检测', '❌', '✅', '✅'],
                  ['AI 语义搜索', '❌', '❌', '✅'],
                  ['AI 经营诊断', '❌', '❌', '✅'],
                  ['AI 合同生成', '❌', '❌', '✅'],
                  ['收支台账', '基础', '自动生成', '自动生成'],
                  ['合作方管理', '✅', '✅', '✅'],
                  ['资产管理', '❌', '✅', '✅'],
                  ['证照管理', '❌', '✅', '✅'],
                  ['行业插件', '通用', '2个', '全部'],
                  ['经营主体数', '1个', '2个', '不限'],
                  ['团队协作', '❌', '5人', '不限'],
                  ['组织架构', '❌', '❌', '✅'],
                  ['审批流', '❌', '❌', '✅'],
                  ['电子印章', '❌', '❌', '✅'],
                  ['审计日志', '❌', '❌', '✅'],
                  ['OpenAPI', '❌', '只读', '读写'],
                  ['Webhook', '❌', '❌', '✅'],
                  ['私有化部署', '❌', '❌', '✅'],
                  ['专属客服', '社区', '在线', '专属经理'],
                ].map(([feature, free, sme, enterprise]) => (
                  <tr key={feature} className="border-b border-muted">
                    <td className="py-3 pr-4 font-medium">{feature}</td>
                    <td className="text-center py-3 px-4">{free}</td>
                    <td className={`text-center py-3 px-4 ${free !== sme ? 'bg-primary/5 font-medium' : ''}`}>{sme}</td>
                    <td className="text-center py-3 px-4">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">常见问题</h2>
          </div>
          <div className="space-y-6">
            {FAQ.map((faq) => (
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
