'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Wrench, MapPin, Truck, Search, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  HOUSE: { label: '房源资产', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  EQUIPMENT: { label: '设备资产', icon: Wrench, color: 'text-amber-600 bg-amber-50' },
  LAND: { label: '土地资产', icon: MapPin, color: 'text-green-600 bg-green-50' },
  VEHICLE: { label: '车辆资产', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  OTHER: { label: '其他资产', icon: Building2, color: 'text-gray-600 bg-gray-50' },
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchAssets(); }, []);

  async function fetchAssets() {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data.assets || []);
      setStats(data.stats || {});
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const filtered = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.identifier || '').toLowerCase().includes(search.toLowerCase())
  );

  const TYPE_CONFIG_MAP = TYPE_CONFIG as Record<string, { label: string; icon: any; color: string }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">资产管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理房源、设备、土地等资产，关联合同与证照
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button><Plus className="h-4 w-4 mr-2" />新增资产</Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">全部资产</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">{stats.total || 0}</p></CardContent>
        </Card>
        {['HOUSE', 'EQUIPMENT', 'LAND', 'VEHICLE'].map(type => (
          <Card key={type}>
            <CardHeader className="p-4"><CardTitle className="text-sm">{TYPE_CONFIG_MAP[type]?.label || type}</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">{stats[type.toLowerCase()] || 0}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索资产名称或编号..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">暂无资产数据</p>
            <p className="text-sm text-muted-foreground mb-4">添加合同后，关联的资产将自动展示在这里</p>
            <Link href="/dashboard/upload"><Button variant="outline">上传合同</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((asset: any) => {
            const cfg = TYPE_CONFIG_MAP[asset.type] || TYPE_CONFIG_MAP.OTHER;
            const Icon = cfg.icon;
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/contracts`)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{asset.name}</p>
                        <Badge variant="outline" className="text-xs shrink-0">{cfg.label}</Badge>
                      </div>
                      {asset.identifier && (
                        <p className="text-sm text-muted-foreground mt-1">编号: {asset.identifier}</p>
                      )}
                      {asset.value && (
                        <p className="text-sm font-medium mt-1">价值: ¥{asset.value.toLocaleString()}</p>
                      )}
                      {asset.nextMaintenanceAt && new Date(asset.nextMaintenanceAt) <= new Date(Date.now() + 30*24*60*60*1000) && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          {new Date(asset.nextMaintenanceAt) <= new Date() ? '已过维保期' : '即将维保'}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
