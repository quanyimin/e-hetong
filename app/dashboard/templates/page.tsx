'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, FileText, Copy, Eye, Building2, UtensilsCrossed, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  null: { label: '通用', icon: LayoutDashboard, color: 'text-gray-600 bg-gray-50' },
  LANDLORD: { label: '房东/租赁', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  RESTAURANT: { label: '餐饮门店', icon: UtensilsCrossed, color: 'text-orange-600 bg-orange-50' },
};

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: '采购', LEASE: '租赁', SERVICE: '服务',
  LABOR: '劳务', SALE: '销售', NDA: '保密协议', OTHER: '其他',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (industry !== 'all') params.set('industry', industry);
    fetch(`/api/templates?${params}`).then(r => r.json()).then(d => {
      setTemplates(d.templates || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [industry]);

  function getConfig(code: string | null) {
    return INDUSTRY_CONFIG[code ?? 'null'] || INDUSTRY_CONFIG['null'];
  }

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">合同模板库</h1>
        <p className="text-sm text-muted-foreground mt-1">
          已预置 {templates.length} 个行业模板，AI 一键生成专属合同
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="搜索模板名称..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs value={industry} onValueChange={setIndustry}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="LANDLORD" className="gap-2">
            <Building2 className="h-4 w-4" /> 房东/租赁
          </TabsTrigger>
          <TabsTrigger value="RESTAURANT" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" /> 餐饮门店
          </TabsTrigger>
          <TabsTrigger value="null" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> 通用
          </TabsTrigger>
        </TabsList>

        <TabsContent value={industry} className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无模板</p>
              <p className="text-sm text-muted-foreground">行业模板持续更新中</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tpl: any) => {
                const cfg = getConfig(tpl.industry);
                const Icon = cfg.icon;
                return (
                  <Card key={tpl.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${cfg.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{tpl.name}</p>
                            <Badge variant="outline" className="text-xs shrink-0">{TYPE_LABELS[tpl.type] || tpl.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary" className="text-xs">{cfg.label}</Badge>
                            {tpl.isOfficial && <Badge variant="default" className="text-xs bg-green-500">官方模板</Badge>}
                            <span className="text-xs text-muted-foreground ml-auto">已用 {tpl.usageCount || 0} 次</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="text-xs gap-1 flex-1">
                              <Eye className="h-3 w-3" /> 预览
                            </Button>
                            <Button size="sm" className="text-xs gap-1 flex-1" onClick={() => router.push(`/dashboard/upload?template=${tpl.id}`)}>
                              <Copy className="h-3 w-3" /> 使用模板
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
