'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  FileText, Bot, Sparkles, Upload, Wand2, ClipboardList,
  MessageSquare, AlertTriangle, Clock, CheckCircle2,
  ArrowRight, ChevronRight, ShieldCheck, Send,
  Zap, TrendingUp, Scale, DollarSign, Users, Crown,
  Mic, MicOff, Globe, Share2, Gift, CreditCard, Code,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentInfo {
  roleCode: string;
  roleName: string;
  description: string;
  icon: any;
  color: string;
  status: 'active' | 'idle';
  todayTasks: number;
  foundIssues: number;
  todayLabel: string;
}

const QUICK_COMMANDS = [
  { label: '帮我审查合同', action: '审查合同', icon: ShieldCheck, color: 'from-blue-500 to-indigo-500' },
  { label: '生成采购合同', action: '生成合同', icon: Wand2, color: 'from-violet-500 to-purple-500' },
  { label: '查看合同状态', action: '查询状态', icon: ClipboardList, color: 'from-emerald-500 to-teal-500' },
  { label: '履约到期提醒', action: '到期提醒', icon: Clock, color: 'from-amber-500 to-orange-500' },
];

export default function AiModeHomePage() {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentActivity, setAgentActivity] = useState<{ agents: AgentInfo[]; summary: any } | null>(null);
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/contracts?limit=3').then(r => r.json()),
      fetch('/api/agent-activity').then(r => r.json()),
      fetch('/api/stats/overview').then(r => r.json()),
    ]).then(([contractsData, agentData, statsData]) => {
      setRecentContracts(contractsData.data?.list || contractsData.list || contractsData.data || []);
      if (agentData.code === 0) setAgentActivity(agentData.data);
      const statsPayload = statsData.stats || statsData.data || statsData || {};
      setStats(statsPayload);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `您好！我是您的AI合同助手。今天有 ${stats.pendingSignCount || 0} 份合同待签署，${stats.expiringCount || 0} 份即将到期。\n\n您可以直接告诉我需求，比如：\n- 帮我审查这份合同\n- 生成一份采购合同\n- 查看合同状态\n- 履约到期提醒\n\n或者点击下方快捷指令快速开始。`,
      timestamp: new Date(),
    };
    if (!messages.find(m => m.id === 'welcome')) {
      setMessages([welcomeMessage]);
    }
  }, [stats]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setRecordingText(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        setRecordingText('');
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          setIsRecording(false);
          if (recordingText.trim()) {
            setInputValue(recordingText);
          }
          setRecordingText('');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, recordingText]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (recordingText.trim()) {
        setInputValue(recordingText);
      }
      setRecordingText('');
    } else {
      setRecordingText('');
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    abortRef.current = new AbortController();
    let fullText = '';
    const assistantMsgId = `msg-${Date.now()}-assistant`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputValue }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('请求失败');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('响应流不可读');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEvent === 'navigate') {
                const assistantMessage: ChatMessage = {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: data.message || '正在为您跳转...',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
                setTimeout(() => {
                  if (data.route) {
                    router.push(data.route);
                  }
                }, 1000);
                return;
              } else if (currentEvent === 'chunk') {
                if (data.text) {
                  fullText += data.text;
                  setMessages(prev => {
                    const existingIdx = prev.findIndex(m => m.id === assistantMsgId);
                    if (existingIdx >= 0) {
                      const updated = [...prev];
                      updated[existingIdx] = {
                        ...updated[existingIdx],
                        content: fullText,
                      };
                      return updated;
                    }
                    return [...prev, {
                      id: assistantMsgId,
                      role: 'assistant' as const,
                      content: fullText,
                      timestamp: new Date(),
                    }];
                  });
                }
              } else if (currentEvent === 'done') {
                if (data.content && data.content !== fullText) {
                  fullText = data.content;
                  setMessages(prev => {
                    const existingIdx = prev.findIndex(m => m.id === assistantMsgId);
                    if (existingIdx >= 0) {
                      const updated = [...prev];
                      updated[existingIdx] = {
                        ...updated[existingIdx],
                        content: fullText,
                      };
                      return updated;
                    }
                    return [...prev, {
                      id: assistantMsgId,
                      role: 'assistant' as const,
                      content: fullText,
                      timestamp: new Date(),
                    }];
                  });
                }
              } else if (currentEvent === 'error') {
                throw new Error(data.message || '处理出错');
              }
            } catch {
              continue;
            }
            currentEvent = '';
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: '抱歉，AI服务暂时不可用，请稍后重试。',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  const handleQuickCommand = (command: string) => {
    setInputValue(command);
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pendingSignCount = stats.pendingSignCount || 0;
  const expiringCount = stats.expiringCount || 0;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ===== 欢迎语 ===== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                AI合同助手
              </h1>
              <p className="text-sm text-slate-500">智能处理合同全生命周期</p>
            </div>
          </div>
          {/* 空状态引导：新用户无数据时提示快速开始 */}
          {pendingSignCount === 0 && expiringCount === 0 && !stats?.totalContracts && (
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>
                  欢迎使用！当前为空状态，建议从
                  <Link href="/dashboard/upload" className="text-indigo-600 font-medium mx-1 hover:underline">上传第一份合同</Link>
                  或
                  <Link href="/dashboard/contracts/generate" className="text-indigo-600 font-medium mx-1 hover:underline">AI 生成合同</Link>
                  快速开始
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ===== 主内容区域：对话 + 侧边栏 ===== */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ===== 左侧：对话主区域 ===== */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-[500px] lg:h-[600px] flex flex-col">
              {/* 对话消息区域 */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 md:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    }`}>
                      {msg.role === 'user' ? (
                        <span className="text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
                      ) : (
                        <Bot className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      )}
                    </div>
                    <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-3 py-2 md:px-4 md:py-2 rounded-2xl text-xs md:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                    <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 快捷指令区域 */}
              <div className="px-4 py-2 border-t border-slate-100">
                <div className="flex flex-wrap gap-2">
                  {QUICK_COMMANDS.map((cmd, index) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuickCommand(cmd.action)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cmd.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 输入区域 */}
              <div className="p-3 md:p-4 border-t border-slate-100">
                <div className="flex items-end gap-2 md:gap-3">
                  <Link href="/dashboard/upload" className="p-2 md:p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    <Upload className="h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                  <button
                    onClick={toggleRecording}
                    disabled={isProcessing}
                    className={`p-2 md:p-3 rounded-xl transition-all ${
                      isRecording
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isRecording ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="输入您的需求，例如：帮我审查合同、生成采购合同..."
                      className="w-full px-3 py-2 md:px-4 md:py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs md:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                      rows={2}
                      disabled={isProcessing}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isProcessing || !inputValue.trim()}
                    className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 右侧：智能侧边栏（桌面端） ===== */}
          <div className="hidden lg:block lg:w-80 space-y-4">
            {/* 快捷操作卡片 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                快捷操作
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '审查合同', icon: Upload, color: 'from-blue-500 to-indigo-500', href: '/dashboard/upload' },
                  { label: '生成合同', icon: Wand2, color: 'from-violet-500 to-purple-500', href: '/dashboard/contracts/generate' },
                  { label: '合同管理', icon: ClipboardList, color: 'from-emerald-500 to-teal-500', href: '/dashboard/contracts' },
                  { label: '电子签署', icon: Scale, color: 'from-amber-500 to-orange-500', href: '/dashboard/esign' },
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link key={index} href={action.href}>
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{action.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* AI员工状态 */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-500" />
                我的AI员工
                {agentActivity && agentActivity.summary && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {agentActivity.summary?.activeAgents ?? 0}/{agentActivity.summary?.totalAgents ?? 0} 在岗
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {(agentActivity?.agents || []).slice(0, 4).map((agent) => {
                  const IconMap: Record<string, any> = { Scale, ShoppingCart: Zap, TrendingUp, DollarSign, Users, Crown };
                  const Icon = IconMap[agent.icon] || Bot;
                  const isActive = agent.status === 'active';
                  return (
                    <div key={agent.roleCode} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{agent.roleName}</p>
                        <p className="text-[10px] text-slate-400">{agent.todayLabel}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 待办提醒 */}
            {(pendingSignCount > 0 || expiringCount > 0) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  今日待办
                </h3>
                <div className="space-y-2">
                  {pendingSignCount > 0 && (
                    <Link href="/dashboard/contracts?filter=signing">
                      <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-amber-100/50 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <span className="text-xs text-slate-700">{pendingSignCount} 份合同待签署</span>
                      </div>
                    </Link>
                  )}
                  {expiringCount > 0 && (
                    <Link href="/dashboard/contracts?filter=expiring">
                      <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-amber-100/50 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        </div>
                        <span className="text-xs text-slate-700">{expiringCount} 份合同即将到期</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* 最近合同 */}
            {recentContracts.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  最近合同
                </h3>
                <div className="space-y-2">
                  {recentContracts.slice(0, 3).map((c: any) => (
                    <Link key={c.id} href={`/dashboard/contracts/${c.id}`}>
                      <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.partyA || c.partyB || '—'}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== 移动端快捷操作区 ===== */}
        <div className="lg:hidden mt-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            快捷操作
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '审查', icon: Upload, color: 'from-blue-500 to-indigo-500', href: '/dashboard/upload' },
              { label: '生成', icon: Wand2, color: 'from-violet-500 to-purple-500', href: '/dashboard/contracts/generate' },
              { label: '管理', icon: ClipboardList, color: 'from-emerald-500 to-teal-500', href: '/dashboard/contracts' },
              { label: '签署', icon: Scale, color: 'from-amber-500 to-orange-500', href: '/dashboard/esign' },
            ].map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{action.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 移动端待办 */}
          {(pendingSignCount > 0 || expiringCount > 0) && (
            <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                今日待办
              </h3>
              <div className="flex gap-3">
                {pendingSignCount > 0 && (
                  <Link href="/dashboard/contracts?filter=signing" className="flex-1 bg-white rounded-xl p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-sm text-slate-700">{pendingSignCount} 份待签</span>
                  </Link>
                )}
                {expiringCount > 0 && (
                  <Link href="/dashboard/contracts?filter=expiring" className="flex-1 bg-white rounded-xl p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                    <span className="text-sm text-slate-700">{expiringCount} 份到期</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== 平台核心亮点 ===== */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm md:text-base font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-indigo-500" />
              平台核心能力
              <span className="text-[10px] md:text-xs text-slate-400 font-normal">多·倍·提·效</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                label: '开放平台 API',
                desc: '100+ API 接口 · SDK 支持',
                tag: '集成',
                icon: Globe,
                gradient: 'from-indigo-500 via-blue-500 to-indigo-600',
                href: '/dashboard/open-platform',
                highlight: 'API SDK Webhook 全链路开放',
              },
              {
                label: '分销中心',
                desc: '三级分销 · 返佣 15-25%',
                tag: '变现',
                icon: Share2,
                gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
                href: '/dashboard/distribution',
                highlight: '邀请奖励 / 分销 / 代理 三级返佣',
              },
              {
                label: 'RPA 自动化',
                desc: '零代码 · 定时任务',
                tag: '提效',
                icon: Bot,
                gradient: 'from-purple-500 via-violet-500 to-purple-600',
                href: '/dashboard/rpa',
                highlight: '合同起草 / 签署 / 归档 全自动',
              },
              {
                label: '合规审计',
                desc: '全链路留痕 · CA 认证',
                tag: '安全',
                icon: ShieldCheck,
                gradient: 'from-amber-500 via-orange-500 to-amber-600',
                href: '/dashboard/compliance',
                highlight: '司法存证 / 审计日志 / 加密存证',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={idx} href={item.href}>
                  <div className="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500">
                    <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl bg-gradient-to-br ${item.gradient} opacity-[0.06] -translate-y-10 translate-x-10 group-hover:opacity-[0.12] transition-opacity duration-500`} />
                    <div className="relative p-5 md:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 font-medium">
                          {item.tag}
                        </span>
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-slate-800">{item.label}</h3>
                      <p className="text-xs md:text-sm text-slate-500 mt-1.5">{item.desc}</p>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                        <span className="text-[11px] md:text-xs text-indigo-600 font-medium truncate">{item.highlight}</span>
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-indigo-500 group-hover:translate-x-0.5 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ===== 商业化入口 ===== */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Link href="/dashboard/distribution" className="block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100 p-5 md:p-6 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 group">
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-emerald-200/20 blur-3xl -translate-y-12 translate-x-12" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <Gift className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">推荐有礼</span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800">邀请好友 · 最高返佣 25%</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">专属邀请链接，成功签约即可获赠时长和返佣，分销商 30 条合同额度</p>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs md:text-sm font-medium">
                  <span>立即生成邀请链接</span>
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/settings?tab=subscription" className="block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-amber-100 p-5 md:p-6 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500 group">
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-amber-200/20 blur-3xl -translate-y-12 translate-x-12" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                  </div>
                  <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">升级套餐</span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800">企业版 · 无限签发不限量</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">解锁批量签署 / CA 认证 / 审批流 / 无限合同，团队协作</p>
                <div className="mt-4 flex items-center gap-2 text-amber-600 text-xs md:text-sm font-medium">
                  <span>查看套餐详情</span>
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/open-platform" className="block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border border-blue-100 p-5 md:p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 group">
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-blue-200/20 blur-3xl -translate-y-12 translate-x-12" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <Code className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] md:text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">开发者</span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800">开放平台 · 系统集成</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">API / SDK / Webhook，集成到企业自有系统</p>
                <div className="mt-4 flex items-center gap-2 text-blue-600 text-xs md:text-sm font-medium">
                  <span>接入文档</span>
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
