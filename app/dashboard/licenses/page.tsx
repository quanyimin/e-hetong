'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileText, AlertTriangle, CheckCircle2, Clock, IdCard, GraduationCap, Award, Car, Briefcase, FileType } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TYPE_LABELS: Record<string, string> = {
  ID_CARD: '身份证',
  GRADUATION: '毕业证',
  HONOR: '荣誉证书',
  DRIVER_LICENSE: '驾驶证',
  PROFESSIONAL: '职业证书',
  OTHER: '其他',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  ID_CARD: IdCard,
  GRADUATION: GraduationCap,
  HONOR: Award,
  DRIVER_LICENSE: Car,
  PROFESSIONAL: Briefcase,
  OTHER: FileType,
};

const TYPE_TABS = [
  { key: '', label: '全部', icon: FileText },
  { key: 'ID_CARD', label: '身份证', icon: IdCard },
  { key: 'GRADUATION', label: '毕业证', icon: GraduationCap },
  { key: 'HONOR', label: '荣誉证书', icon: Award },
  { key: 'DRIVER_LICENSE', label: '驾驶证', icon: Car },
  { key: 'PROFESSIONAL', label: '职业证书', icon: Briefcase },
  { key: 'OTHER', label: '其他', icon: FileType },
];

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchLicenses(); }, []);

  async function fetchLicenses() {
    setLoading(true);
    try {
      const res = await fetch('/api/licenses');
      const data = await res.json();
      setLicenses(data.licenses || []);
      setStats(data.stats || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filteredByType = activeType
    ? licenses.filter(l => l.type === activeType)
    : licenses;

  const filtered = filteredByType.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.licenseNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  function getDaysLeft(expireDate: string): number {
    const diff = new Date(expireDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getStatusBadge(license: any) {
    if (!license.expireDate) return <Badge variant="outline">正常</Badge>;
    const days = getDaysLeft(license.expireDate);
    if (days <= 0) return <Badge variant="destructive">已过期</Badge>;
    if (days <= 30) return <Badge variant="default" className="bg-amber-500">即将到期 ({days}天)</Badge>;
    return <Badge variant="secondary">{days}天后到期</Badge>;
  }

  const TypeIcon = activeType ? TYPE_ICONS[activeType] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">证照管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            统一管理各类证照，到期自动提醒
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/licenses/new')}>
          <FileText className="h-4 w-4 mr-2" />新增证照
        </Button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">全部</CardTitle></CardHeader><CardContent className="px-4 pb-4"><p className="text-2xl font-bold">{stats.total || 0}</p></CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">正常</CardTitle></CardHeader><CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-green-600">{stats.active || 0}</p></CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">即将到期</CardTitle></CardHeader><CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-amber-600">{stats.expiring || 0}</p></CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">已过期</CardTitle></CardHeader><CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-red-600">{stats.expired || 0}</p></CardContent></Card>
      </div>

      {/* 分类Tab */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeType === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="搜索证照名称或许可证号..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">
            {activeType ? `暂无${TYPE_LABELS[activeType]}数据` : '暂无证照数据'}
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard/licenses/new')}>新增证照</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((license: any) => {
            const ItemIcon = TYPE_ICONS[license.type] || FileText;
            return (
              <Card key={license.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/licenses/${license.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <ItemIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{license.name}</p>
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[license.type] || license.type}</Badge>
                      </div>
                      {license.licenseNumber && (
                        <p className="text-sm text-muted-foreground mt-1">编号: {license.licenseNumber}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(license)}
                        {license.issuingAuthority && (
                          <span className="text-xs text-muted-foreground">{license.issuingAuthority}</span>
                        )}
                      </div>
                      {license.expireDate && getDaysLeft(license.expireDate) <= 30 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          <AlertTriangle className="h-3 w-3" />
                          {getDaysLeft(license.expireDate) <= 0 ? '已过期，请及时续期' : `${getDaysLeft(license.expireDate)}天后到期，请提前准备续期材料`}
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
