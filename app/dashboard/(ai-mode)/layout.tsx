'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Bot, Sparkles, Settings, User, Building2, Home,
  Upload, Layers, Wand2, ClipboardList, TrendingUp, Shield,
  MessageSquare, Clock, AlertTriangle, ChevronRight, PlusCircle,
  Search, Bell, LogOut, Stamp, Share2, Globe, Wallet, Bot as RpaIcon,
  PenTool, Database,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { ModeToggle } from '@/components/mode-toggle';
import { useMode } from '@/lib/mode-context';

export default function AiModeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenant, user, logout } = useAuth();
  const { mode } = useMode();

  React.useEffect(() => {
    document.body.classList.add('is-dashboard');
    document.documentElement.classList.add('is-dashboard');
    return () => {
      document.body.classList.remove('is-dashboard');
      document.documentElement.classList.remove('is-dashboard');
    };
  }, []);

  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const userMenuBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) &&
          userMenuBtnRef.current && !userMenuBtnRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.role === 'admin';
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const quickActions = [
    { path: '/dashboard/upload', icon: Upload, label: '审查合同', desc: '上传文件，AI自动审查', color: 'from-blue-500 to-indigo-500' },
    { path: '/dashboard/contracts/generate', icon: Wand2, label: '生成合同', desc: '描述需求，AI帮您写', color: 'from-violet-500 to-pink-500' },
    { path: '/dashboard/contracts', icon: ClipboardList, label: '我的合同', desc: '查看所有合同', color: 'from-emerald-500 to-teal-500' },
    { path: '/dashboard/ai-chat', icon: MessageSquare, label: 'AI咨询', desc: '直接和AI对话', color: 'from-amber-500 to-orange-500' },
    { path: '/dashboard/esign', icon: PenTool, label: '发起签署', desc: '电子签章流程', color: 'from-indigo-500 to-purple-600' },
    { path: '/dashboard/esign/seals', icon: Stamp, label: '印章授权', desc: '印章管理与授权', color: 'from-rose-500 to-pink-600' },
  ];

  // 高级功能入口（AI模式下通过「更多」展开）
  const advancedLinks = [
    { path: '/dashboard/open-platform', icon: Globe, label: '开放平台', desc: 'API集成/SDK/密钥' },
    { path: '/dashboard/distribution', icon: Share2, label: '分销中心', desc: '邀请返佣/分销管理' },
    { path: '/dashboard/rpa', icon: RpaIcon, label: 'RPA自动化', desc: '任务编排/定时调度' },
    { path: '/dashboard/esign/approvals', icon: Shield, label: '审批管理', desc: '审批流/审批统计' },
    { path: '/dashboard/settings?tab=subscription', icon: Wallet, label: '计费中心', desc: '套餐/充值/账单' },
    { path: '/dashboard/knowledge-base', icon: Database, label: '知识库', desc: '企业知识/文档' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* ==================== 左侧快捷入口栏（桌面端） ==================== */}
      <aside className="hidden md:flex w-20 flex-col border-r bg-white shrink-0">
        <div className="flex h-16 items-center justify-center border-b shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col items-center gap-2">
          <Link href="/dashboard" className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            pathname === '/dashboard' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <Sparkles className="h-5 w-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              AI 工作台
            </span>
          </Link>
          <Link href="/dashboard/contracts" className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            pathname?.startsWith('/dashboard/contracts') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <ClipboardList className="h-5 w-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              合同管理
            </span>
          </Link>
          <Link href="/dashboard/upload" className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            pathname?.startsWith('/dashboard/upload') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <Upload className="h-5 w-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              上传审查
            </span>
          </Link>
          <Link href="/dashboard/ai-chat" className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            pathname?.startsWith('/dashboard/ai-chat') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <MessageSquare className="h-5 w-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              AI 对话
            </span>
          </Link>
          {/* 高级功能展开 */}
          {advancedOpen && advancedLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname?.startsWith(link.path.split('?')[0]);
            return (
              <Link key={link.path} href={link.path} className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative animate-in fade-in slide-in-from-bottom-2',
                active ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              )}>
                <Icon className="h-5 w-5" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {link.label}
                </span>
              </Link>
            );
          })}
          <div className="flex-1" />
          <button onClick={() => setAdvancedOpen(!advancedOpen)} className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            advancedOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <ChevronRight className={cn('h-5 w-5 transition-transform', advancedOpen && 'rotate-90')} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {advancedOpen ? '收起' : '更多功能'}
            </span>
          </button>
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all group relative',
            'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          )}>
            <Settings className="h-5 w-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              设置
            </span>
          </button>
        </nav>
      </aside>

      {/* ==================== 移动端底部导航 ==================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-white">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/dashboard" className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors',
            pathname === '/dashboard' ? 'text-indigo-600' : 'text-slate-500'
          )}>
            <Sparkles className="h-5 w-5" />
            <span>AI 首页</span>
          </Link>
          <Link href="/dashboard/contracts" className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors',
            pathname?.startsWith('/dashboard/contracts') ? 'text-indigo-600' : 'text-slate-500'
          )}>
            <ClipboardList className="h-5 w-5" />
            <span>合同</span>
          </Link>
          <Link href="/dashboard/upload" className="flex flex-col items-center -mt-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <PlusCircle className="h-7 w-7 text-white" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium text-slate-600">发起</span>
          </Link>
          <Link href="/dashboard/ai-chat" className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors',
            pathname?.startsWith('/dashboard/ai-chat') ? 'text-indigo-600' : 'text-slate-500'
          )}>
            <MessageSquare className="h-5 w-5" />
            <span>对话</span>
          </Link>
          <Link href="/dashboard/settings" className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors',
            pathname?.startsWith('/dashboard/settings') ? 'text-indigo-600' : 'text-slate-500'
          )}>
            <Settings className="h-5 w-5" />
            <span>我的</span>
          </Link>
        </div>
      </nav>

      {/* ==================== 主内容区 ==================== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b shrink-0">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">AI 合同助手</p>
                <p className="text-[10px] text-slate-400">智能处理您的合同事务</p>
              </div>
            </div>
            <div className="flex-1 max-w-md mx-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索合同..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Bell className="h-5 w-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              </button>
              <button ref={userMenuBtnRef as any} onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </div>
      </main>

      {/* 用户菜单 */}
      {userMenuOpen && (
        <div ref={userMenuRef as any} className="fixed right-4 top-16 z-50 w-64 rounded-lg border bg-white shadow-xl">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email || user?.phone || ''}</p>
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
            <Settings className="h-4 w-4" />设置
          </Link>
          <Link href="/dashboard/tenants" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
            <Building2 className="h-4 w-4" />主体管理
          </Link>
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
              <Shield className="h-4 w-4" />管理后台
            </Link>
          )}
          <div className="border-t mt-2">
            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => { setUserMenuOpen(false); logout(); }}>
              <LogOut className="h-4 w-4" />退出登录
            </button>
          </div>
        </div>
      )}

      {/* ==================== Cmd+K 全局命令面板 ==================== */}
      <CommandPalette />
    </div>
  );
}
