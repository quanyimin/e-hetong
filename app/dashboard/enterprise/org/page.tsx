'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Plus, ChevronRight, ChevronDown, Edit2, Search } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  sortOrder: number;
  children?: Department[];
}

export default function EnterpriseOrgPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDepartments(); }, []);

  async function fetchDepartments() {
    setLoading(true);
    try {
      const res = await fetch('/api/enterprise/org');
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function buildTree(items: Department[]): Department[] {
    const map = new Map<string, Department>();
    const roots: Department[] = [];
    items.forEach(item => map.set(item.id, { ...item, children: [] }));
    items.forEach(item => {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(map.get(item.id)!);
      } else {
        roots.push(map.get(item.id)!);
      }
    });
    return roots;
  }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function renderTree(nodes: Department[], depth = 0) {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => node.children?.length && toggleExpand(node.id)}
        >
          <div className="w-5 flex justify-center">
            {node.children?.length ? (
              expanded.has(node.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <span className="w-4" />
            )}
          </div>
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1">{node.name}</span>
          <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {node.children?.length || 0} 子部门
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {expanded.has(node.id) && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  }

  const tree = buildTree(departments);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">组织架构</h1>
          <p className="text-sm text-muted-foreground mt-1">管理集团、公司、部门的多级组织树</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />新增部门
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索部门..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">暂无组织架构</p>
              <p className="text-sm text-muted-foreground mb-4">新增部门来构建您的企业组织树</p>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" />新增部门</Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderTree(tree)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
