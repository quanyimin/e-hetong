'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, Loader2, FileText, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  highlightedTitle: string;
  partyA: string;
  partyB: string;
  amount: number;
  status: string;
  direction: string;
  score: number;
}

function formatMoney(val: number) {
  return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '生效中', color: 'text-green-600 bg-green-50 border-green-200' },
  EXPIRED: { label: '已到期', color: 'text-gray-500 bg-gray-50 border-gray-200' },
  TERMINATED: { label: '已终止', color: 'text-red-600 bg-red-50 border-red-200' },
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout>();

  // Cmd+K / Ctrl+K 快捷键
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        if (!open) setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // 搜索防抖
  const handleSearch = React.useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}&limit=8`);
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  // 导航到合同详情
  const navigateTo = (id: string) => {
    setOpen(false);
    setQuery('');
    router.push(`/dashboard/contracts/${id}`);
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      navigateTo(results[selectedIndex].id);
    }
  };

  return (
    <>
      {/* 搜索入口按钮（导航栏用） */}
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md border border-input bg-muted/50 hover:bg-accent hover:text-accent-foreground transition-colors w-56"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">搜索合同...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background rounded border">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </button>

      {/* 搜索浮层 */}
      {open && (
        <>
          {/* 遮罩 */}
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />

          {/* 搜索面板 */}
          <div className="fixed left-1/2 top-[15%] -translate-x-1/2 z-50 w-full max-w-xl">
            <div className="bg-background rounded-xl border shadow-2xl overflow-hidden">
              {/* 输入框 */}
              <div className="flex items-center gap-3 px-4 border-b">
                {loading ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索合同名称、甲方、乙方..."
                  className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                {query && (
                  <button onClick={() => { setQuery(''); setResults([]); }} className="p-1 rounded hover:bg-accent">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border">
                  ESC
                </kbd>
              </div>

              {/* 结果列表 */}
              <div className="max-h-80 overflow-y-auto">
                {query && !loading && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">未找到匹配的合同</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">尝试更换关键词搜索</p>
                  </div>
                )}

                {results.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                      idx === selectedIndex && 'bg-accent'
                    )}
                  >
                    <div className={cn(
                      'p-1.5 rounded-lg shrink-0 mt-0.5',
                      item.direction === 'INCOME' || item.direction === 'IN'
                        ? 'bg-green-100'
                        : item.direction === 'EXPENSE' || item.direction === 'OUT'
                        ? 'bg-orange-100'
                        : 'bg-blue-100'
                    )}>
                      {item.direction === 'INCOME' || item.direction === 'IN' ? (
                        <ArrowDownRight className="h-4 w-4 text-green-600" />
                      ) : item.direction === 'EXPENSE' || item.direction === 'OUT' ? (
                        <ArrowUpRight className="h-4 w-4 text-orange-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 带高亮的标题 */}
                      <p
                        className="text-sm font-medium truncate [&>mark]:bg-yellow-200 [&>mark]:text-foreground [&>mark]:px-0.5 [&>mark]:rounded"
                        dangerouslySetInnerHTML={{ __html: item.highlightedTitle || item.title }}
                      />
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {item.partyA}{item.partyA && item.partyB ? ' ↔ ' : ''}{item.partyB}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">{formatMoney(item.amount)}</span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border',
                        STATUS_BADGE[item.status]?.color || 'text-gray-500 bg-gray-50 border-gray-200'
                      )}>
                        {STATUS_BADGE[item.status]?.label || item.status}
                      </span>
                    </div>
                  </button>
                ))}

                {/* 加载状态 */}
                {loading && (
                  <div className="px-4 py-8 text-center">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">搜索中...</p>
                  </div>
                )}
              </div>

              {/* 底部提示 */}
              {results.length > 0 && (
                <div className="px-4 py-2 border-t text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>共 {results.length} 条结果</span>
                  <span>↑↓ 导航 · Enter 跳转</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
