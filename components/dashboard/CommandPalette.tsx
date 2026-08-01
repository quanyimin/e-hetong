'use client';

// 全局命令面板 - Cmd+K / Ctrl+K 触发
// 功能：
// 1. 快速搜索合同（输入关键词 → 跳转合同列表筛选）
// 2. 快速导航（输入页面名 → 跳转对应页面）
// 3. 快速操作（发起签署/上传合同/AI生成/模板等）

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home, FileText, PenTool, BookOpen, Wand2, FileCheck, Sparkles,
  Stamp, Globe, Share2, Bot, Settings,
  Search as SearchIcon, X, CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';

// ─── 导航项定义 ────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: string;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '首页', path: '/dashboard', icon: 'Home', group: '导航' },
  { label: '我的合同', path: '/dashboard/contracts', icon: 'FileText', group: '导航' },
  { label: '发起签署', path: '/dashboard/esign/setup', icon: 'PenTool', group: '签署' },
  { label: '合同模板', path: '/dashboard/templates', icon: 'BookOpen', group: '合同' },
  { label: 'AI 生成合同', path: '/dashboard/contracts/generate', icon: 'Wand2', group: 'AI' },
  { label: 'AI 审查', path: '/dashboard/ai-review', icon: 'FileCheck', group: 'AI' },
  { label: 'AI 对话', path: '/dashboard/ai-chat', icon: 'Sparkles', group: 'AI' },
  { label: '印章管理', path: '/dashboard/esign/seals', icon: 'Stamp', group: '签署' },
  { label: '开放平台', path: '/dashboard/open-platform', icon: 'Globe', group: '管理' },
  { label: '分销中心', path: '/dashboard/distribution', icon: 'Share2', group: '管理' },
  { label: 'RPA 自动化', path: '/dashboard/rpa', icon: 'Bot', group: '管理' },
  { label: '系统设置', path: '/dashboard/settings', icon: 'Settings', group: '管理' },
];

// ─── 图标映射 ──────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Home, FileText, PenTool, BookOpen, Wand2, FileCheck, Sparkles,
  Stamp, Globe, Share2, Bot, Settings,
};

function getIcon(name: string): React.ElementType {
  return ICON_MAP[name] || FileText;
}

// ─── 快速搜索建议（输入为合同关键词时，跳转合同列表筛选） ─────
function buildContractSearchAction(query: string): NavItem | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return {
    label: `搜索合同"${trimmed}"`,
    path: `/dashboard/contracts?q=${encodeURIComponent(trimmed)}`,
    icon: 'FileText',
    group: '搜索',
  };
}

// ─── 主组件 ────────────────────────────────────────────────
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // 监听全局快捷键：Cmd+K / Ctrl+K 切换面板，Escape 关闭
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K (macOS) / Ctrl+K (Windows/Linux) - 切换面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Escape - 关闭面板
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 打开面板时自动聚焦输入框
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // 等待 DOM 渲染后聚焦
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // 关闭面板时清理状态
  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // 过滤结果：根据关键词过滤 label 或 group（不区分大小写）
  const filteredItems = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) ||
        item.group.toLowerCase().includes(trimmed),
    );
  }, [query]);

  // 合并结果列表：快速搜索合同操作 + 过滤后的导航项
  const combinedItems = React.useMemo(() => {
    const contractAction = buildContractSearchAction(query);
    const result: NavItem[] = [];
    if (contractAction) result.push(contractAction);
    result.push(...filteredItems);
    return result;
  }, [query, filteredItems]);

  // 当结果列表变化时，重置选中索引
  React.useEffect(() => {
    setSelectedIndex(combinedItems.length > 0 ? 0 : -1);
  }, [combinedItems]);

  // 跳转并关闭面板
  const navigateTo = (item: NavItem) => {
    setOpen(false);
    setQuery('');
    router.push(item.path);
  };

  // 键盘上下键导航 + 回车确认
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, combinedItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < combinedItems.length) {
        navigateTo(combinedItems[selectedIndex]);
      }
    }
  };

  // 滚动选中项到可视区
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const selectedEl = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);

  // 按 group 分组展示结果
  const grouped = React.useMemo(() => {
    const map = new Map<string, NavItem[]>();
    combinedItems.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    });
    return Array.from(map.entries());
  }, [combinedItems]);

  // 不渲染未打开状态
  if (!open) return null;

  // 计算全局索引（用于高亮）
  let runningIndex = 0;

  return (
    <>
      {/* 半透明遮罩层 - 点击关闭 */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
      />

      {/* 命令面板 - 固定居中弹窗 */}
      <div
        className="fixed left-1/2 top-[20vh] -translate-x-1/2 z-[60] w-[92vw] max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-label="全局命令面板"
      >
        <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-4">
          {/* 搜索输入框 */}
          <div className="flex items-center gap-3 px-4 border-b border-slate-100">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索合同、页面、操作..."
              className="flex-1 py-3.5 text-sm text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                aria-label="清空输入"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
          </div>

          {/* 搜索结果列表 */}
          <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
            {/* 空结果提示 */}
            {combinedItems.length === 0 && (
              <div className="px-4 py-10 text-center">
                <SearchIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">未找到匹配项</p>
                <p className="text-xs text-slate-400 mt-1">
                  尝试更换关键词，或直接回车搜索合同
                </p>
              </div>
            )}

            {/* 分组结果 */}
            {grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                {/* 分组标题 */}
                <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {group}
                </div>
                {/* 分组项 */}
                {items.map((item) => {
                  const idx = runningIndex++;
                  const Icon = getIcon(item.icon);
                  const isActive = idx === selectedIndex;
                  return (
                    <button
                      key={`${item.path}-${idx}`}
                      data-index={idx}
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {/* 图标 */}
                      <div
                        className={cn(
                          'p-1.5 rounded-lg shrink-0',
                          isActive
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {/* 文本 */}
                      <span className="flex-1 text-sm font-medium truncate">
                        {item.label}
                      </span>
                      {/* 快捷键提示 */}
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 底部状态栏 */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center px-1 py-0.5 bg-white rounded border border-slate-200 font-mono">
                  <ArrowUp className="h-2.5 w-2.5" />
                </kbd>
                <kbd className="inline-flex items-center px-1 py-0.5 bg-white rounded border border-slate-200 font-mono">
                  <ArrowDown className="h-2.5 w-2.5" />
                </kbd>
                <span className="ml-1">导航</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center px-1 py-0.5 bg-white rounded border border-slate-200 font-mono">
                  ↵
                </kbd>
                <span className="ml-1">选择</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center px-1 py-0.5 bg-white rounded border border-slate-200 font-mono">
                ⌘K
              </kbd>
              <span className="ml-1">切换</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CommandPalette;
