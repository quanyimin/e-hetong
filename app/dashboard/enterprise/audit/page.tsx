'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, History, User, FileText, DollarSign, Shield, Building2 } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建', UPDATE: '修改', DELETE: '删除',
  APPROVE: '审批通过', REJECT: '审批拒绝', EXPORT: '导出',
};

const ENTITY_ICONS: Record<string, any> = {
  CONTRACT: FileText, BILL: DollarSign, PARTNER: User,
  TENANT: Building2, ASSET: Building2, LICENSE: Shield,
};

export default function EnterpriseAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/enterprise/audit').then(r => r.json()).then(d => {
      setLogs(d.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase()) ||
    l.detail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审计日志</h1>
        <p className="text-sm text-muted-foreground mt-1">所有操作全程可追溯，满足合规要求</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索操作记录..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无审计日志</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((log: any) => {
                const EntityIcon = ENTITY_ICONS[log.entity] || Shield;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`p-1.5 rounded-full ${log.action === 'DELETE' ? 'bg-red-100' : log.action === 'CREATE' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <EntityIcon className={`h-4 w-4 ${log.action === 'DELETE' ? 'text-red-500' : log.action === 'CREATE' ? 'text-green-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                        <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                        {log.createdAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{log.detail || `${log.entity} #${log.entityId?.slice(0, 8) || ''}`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
