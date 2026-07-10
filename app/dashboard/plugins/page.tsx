'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, UtensilsCrossed, FileText, ShoppingCart, Monitor, 
  GraduationCap, HeartPulse, Truck, Sprout, Wrench, HardHat,
  Check, Loader2, Store, AlertCircle, ExternalLink
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  FileText, Building2, UtensilsCrossed, HardHat, ShoppingCart,
  Monitor, GraduationCap, HeartPulse, Truck, Sprout, Wrench,
};

interface Plugin {
  id: string; code: string; name: string; description: string;
  icon: string; price: number; isPaid: boolean; type: string;
  purchased: boolean; sceneId: string | null; sceneName: string | null;
  status: string;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取当前租户ID（简化：从 localStorage 或 URL）
  const tenantId = typeof window !== 'undefined' 
    ? (JSON.parse(localStorage.getItem('ehetong_user') || '{}')?.tenantId || 'default')
    : 'default';

  useEffect(() => {
    fetchPlugins();
  }, []);

  async function fetchPlugins() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugins?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.success) setPlugins(data.data);
    } catch (e) { setError('加载插件列表失败'); }
    setLoading(false);
  }

  async function handlePurchase(pluginId: string) {
    setPurchasing(pluginId);
    setError(null);
    try {
      const res = await fetch('/api/plugins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, pluginId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPlugins(); // 刷新列表
      } else {
        setError(data.error || '购买失败');
      }
    } catch { setError('网络错误'); }
    setPurchasing(null);
  }

  // 按行业分类：付费插件排前，免费在后
  const paidPlugins = plugins.filter(p => p.isPaid);
  const freePlugins = plugins.filter(p => !p.isPaid);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <Store className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">插件商店</h1>
          <p className="text-sm text-muted-foreground">按需选购行业插件，拓展合同管理能力</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* 付费插件区 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">行业插件 <Badge variant="secondary">付费</Badge></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paidPlugins.map(plugin => {
            const Icon = ICON_MAP[plugin.icon] || FileText;
            return (
              <Card key={plugin.id} className={`relative overflow-hidden transition-shadow hover:shadow-md ${plugin.purchased ? 'ring-1 ring-primary/30' : ''}`}>
                {plugin.purchased && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />已启用</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plugin.name}</CardTitle>
                      <CardDescription className="text-xs mt-0">{plugin.sceneName || '独立插件'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground min-h-[40px]">{plugin.description}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">¥{plugin.price}</span>
                    <span className="text-xs text-muted-foreground">/年</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {plugin.purchased ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Check className="h-4 w-4 mr-2" /> 已购买
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => handlePurchase(plugin.id)} disabled={purchasing === plugin.id}>
                      {purchasing === plugin.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {purchasing === plugin.id ? '购买中...' : '立即购买'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 免费插件区 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">基础功能 <Badge variant="secondary">免费</Badge></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {freePlugins.map(plugin => {
            const Icon = ICON_MAP[plugin.icon] || FileText;
            return (
              <Card key={plugin.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-base">{plugin.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">{plugin.description}</p>
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-200 bg-green-50">永久免费</Badge>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="h-4 w-4 mr-2" /> 已预置
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
