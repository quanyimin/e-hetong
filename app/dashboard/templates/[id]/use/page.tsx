'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, Loader2, Save, Eye, Edit3,
  User, Building2, DollarSign, Calendar, FileSignature,
  CheckCircle2, ChevronRight, Sparkles, Wand2,
  Info, Zap, Clock, Award,
  Bot, Send, RotateCcw, X, ChevronLeft,
  ShieldCheck, AlertCircle, Plus, Trash2, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  type: string;
  content: string;
  fields: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changes?: string[];
  timestamp: Date;
}

interface TemplateVersion {
  id: string;
  content: string;
  label: string;
  timestamp: Date;
}

const VARIABLE_GROUP_ORDER = ['基本信息', '甲方信息', '乙方信息', '金额与日期', '其他'];

const QUICK_ACTIONS = [
  { id: 'add_nda', label: '增加保密条款', icon: ShieldCheck },
  { id: 'add_breach', label: '强化违约责任', icon: AlertCircle },
  { id: 'add_ip', label: '增加知识产权', icon: FileText },
  { id: 'add_dispute', label: '优化争议解决', icon: Gauge },
  { id: 'simplify', label: '简化表述', icon: Edit3 },
  { id: 'more_formal', label: '更严谨专业', icon: Award },
];

function getVariableGroup(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('甲') || lower.includes('party a') || lower.includes('甲方')) return '甲方信息';
  if (lower.includes('乙') || lower.includes('party b') || lower.includes('乙方')) return '乙方信息';
  if (lower.includes('金额') || lower.includes('amount') || lower.includes('价格') || lower.includes('费用') || lower.includes('日期') || lower.includes('date') || lower.includes('时间')) return '金额与日期';
  if (lower.includes('合同') || lower.includes('名称') || lower.includes('编号') || lower.includes('contract') || lower.includes('name')) return '基本信息';
  return '其他';
}

function getVariableIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('甲') || lower.includes('party') || lower.includes('name') || lower.includes('名称')) {
    return <User className="h-4 w-4 text-blue-500" />;
  }
  if (lower.includes('乙') || lower.includes('company') || lower.includes('企业')) {
    return <Building2 className="h-4 w-4 text-emerald-500" />;
  }
  if (lower.includes('金额') || lower.includes('amount') || lower.includes('price') || lower.includes('费用')) {
    return <DollarSign className="h-4 w-4 text-amber-500" />;
  }
  if (lower.includes('日期') || lower.includes('date') || lower.includes('时间')) {
    return <Calendar className="h-4 w-4 text-violet-500" />;
  }
  return <FileText className="h-4 w-4 text-slate-400" />;
}

export default function UseTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = React.useState<Template | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [contractName, setContractName] = React.useState('');
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = React.useState('基本信息');
  const [highlightedVar, setHighlightedVar] = React.useState<string | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);

  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const aiPanelSwitchingRef = React.useRef(false);
  const lastSwitchTimeRef = React.useRef(0);

  const [versions, setVersions] = React.useState<TemplateVersion[]>([]);
  const [currentContent, setCurrentContent] = React.useState('');
  const [originalContent, setOriginalContent] = React.useState('');

  React.useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch(`/api/templates?id=${templateId}`);
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        setTemplate(data);
        setContractName(data.name + ' - ' + new Date().toLocaleDateString('zh-CN'));
        setCurrentContent(data.content);
        setOriginalContent(data.content);

        const vars = extractVariables(data.content);
        setVariables(vars);

        const groups = Object.entries(groupVariables(vars)).map(([g]) => g);
        if (groups.length > 0) {
          setActiveGroup(groups[0]);
        }

        setVersions([{
          id: 'original',
          content: data.content,
          label: '原始模板',
          timestamp: new Date(),
        }]);

        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `您好！我是您的AI合同助手。我可以帮您调整「${data.name}」模板内容。\n\n您可以直接告诉我您的需求，比如：\n• "增加一条保密条款"\n• "把付款方式改成按月支付"\n• "违约责任写得更严格一些"\n\n也可以点击下方快捷指令快速调整。`,
          timestamp: new Date(),
        }]);
      } catch (error) {
        toast.error('加载模板失败');
        router.push('/dashboard/templates');
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId, router]);

  React.useEffect(() => {
    if (chatEndRef.current && aiPanelOpen) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, aiPanelOpen]);

  React.useEffect(() => {
    if (aiPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [aiPanelOpen]);

  const safeToggleAiPanel = React.useCallback((forceState?: boolean) => {
    const now = Date.now();
    const MIN_SWITCH_INTERVAL = 100;

    if (aiPanelSwitchingRef.current) {
      console.warn('[AI面板] 切换被拒绝：正在切换中');
      return;
    }

    if (now - lastSwitchTimeRef.current < MIN_SWITCH_INTERVAL) {
      console.warn(`[AI面板] 切换被拒绝：间隔过短(${now - lastSwitchTimeRef.current}ms < ${MIN_SWITCH_INTERVAL}ms)`);
      return;
    }

    aiPanelSwitchingRef.current = true;
    lastSwitchTimeRef.current = now;

    const targetState = forceState !== undefined ? forceState : !aiPanelOpen;
    const startTime = performance.now();
    const isMobile = window.innerWidth < 1024;

    console.group('[AI面板] 切换开始');
    console.log('目标状态:', targetState ? '打开' : '关闭');
    console.log('触发方式:', forceState !== undefined ? '主动控制' : '切换');
    console.log('设备类型:', isMobile ? '移动端' : '桌面端');
    console.log('窗口宽度:', window.innerWidth + 'px');
    console.log('当前状态:', aiPanelOpen ? '已打开' : '已关闭');

    // 直接处理body overflow，确保立即生效
    if (targetState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    setAiPanelOpen(targetState);

    requestAnimationFrame(() => {
      const elapsed = performance.now() - startTime;
      console.log('DOM渲染耗时:', elapsed.toFixed(2) + 'ms');

      setTimeout(() => {
        const totalElapsed = performance.now() - startTime;
        console.log('动画完成耗时:', totalElapsed.toFixed(2) + 'ms');
        console.groupEnd();
        aiPanelSwitchingRef.current = false;
      }, 350);
    });
  }, [aiPanelOpen]);

  function extractVariables(content: string): Record<string, string> {
    const vars: Record<string, string> = {};
    const seen = new Set<string>();

    const braceRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = braceRegex.exec(content)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name)) {
        vars[name] = '';
        seen.add(name);
      }
    }

    const underscoreRegex = /_{3,}/g;
    let underscoreIndex = 0;
    while ((match = underscoreRegex.exec(content)) !== null) {
      const name = `填空${underscoreIndex + 1}`;
      if (!seen.has(name)) {
        vars[name] = '';
        seen.add(name);
        underscoreIndex++;
      }
    }

    return vars;
  }

  function groupVariables(vars: Record<string, string>): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    VARIABLE_GROUP_ORDER.forEach(g => { groups[g] = []; });
    Object.keys(vars).forEach(name => {
      const group = getVariableGroup(name);
      if (!groups[group]) groups[group] = [];
      groups[group].push(name);
    });
    return Object.fromEntries(Object.entries(groups).filter(([_, v]) => v.length > 0));
  }

  const groupedVariables = React.useMemo(() => {
    if (!currentContent) return {};
    return groupVariables(variables);
  }, [variables, currentContent]);

  const variableNames = Object.keys(variables);
  const hasVariables = variableNames.length > 0;
  const filledCount = variableNames.filter(k => variables[k].trim()).length;
  const progress = variableNames.length > 0 ? (filledCount / variableNames.length) * 100 : 0;

  function generateContent(): string {
    let content = currentContent || '';

    for (const [key, value] of Object.entries(variables)) {
      if (value) {
        content = content.replace(new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), value);
      }
    }

    let underscoreIndex = 0;
    content = content.replace(/_{3,}/g, () => {
      const key = `填空${underscoreIndex + 1}`;
      underscoreIndex++;
      return variables[key] || '____________';
    });

    return content;
  }

  const previewContent = React.useMemo(() => generateContent(), [variables, currentContent]);

  const handleVarClick = (name: string) => {
    setActiveGroup(getVariableGroup(name));
    setHighlightedVar(name);
    setTimeout(() => setHighlightedVar(null), 2000);
  };

  async function handleAiAdjust(userMessage: string) {
    if (!template || !userMessage.trim()) return;
    
    if (aiLoading) {
      console.warn('[AI模板调整] 请求被拒绝：AI正在处理中');
      toast.warning('AI正在处理中，请稍候...');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      console.log('[AI模板调整] 开始请求:', userMessage.slice(0, 50));

      const res = await fetch('/api/ai/optimize-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: template.name,
          content: currentContent,
          type: template.type,
          userInstruction: userMessage,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'AI调整失败');
      }

      const newContent = data.data.content;
      const changes = data.data.changes || [];

      const versionId = `v${versions.length}`;
      setVersions(prev => [...prev, {
        id: versionId,
        content: newContent,
        label: `AI调整 ${versions.length}`,
        timestamp: new Date(),
      }]);

      setCurrentContent(newContent);

      const newVars = extractVariables(newContent);
      setVariables(prev => {
        const merged: Record<string, string> = {};
        Object.keys(newVars).forEach(k => {
          merged[k] = prev[k] || '';
        });
        return merged;
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `已为您调整模板内容，主要修改如下：`,
        changes,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);

      toast.success(`AI已完成调整，共 ${changes.length} 处修改`);
    } catch (error: any) {
      console.error('[AI模板调整] 失败:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `抱歉，调整失败了：${error.message || '请稍后重试'}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
      toast.error('AI调整失败');
    } finally {
      setAiLoading(false);
    }
  }

  function handleQuickAction(actionId: string) {
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (action) {
      handleAiAdjust(`请${action.label}`);
    }
  }

  function handleRevertToOriginal() {
    if (versions.length > 0) {
      setCurrentContent(originalContent);
      const origVars = extractVariables(originalContent);
      setVariables(prev => {
        const merged: Record<string, string> = {};
        Object.keys(origVars).forEach(k => {
          merged[k] = prev[k] || '';
        });
        return merged;
      });
      toast.info('已恢复到原始模板');
    }
  }

  function handleRevertToVersion(version: TemplateVersion) {
    setCurrentContent(version.content);
    const vars = extractVariables(version.content);
    setVariables(prev => {
      const merged: Record<string, string> = {};
      Object.keys(vars).forEach(k => {
        merged[k] = prev[k] || '';
      });
      return merged;
    });
    toast.info(`已恢复到「${version.label}」`);
  }

  async function handleSaveContract() {
    if (!contractName.trim()) {
      toast.error('请输入合同名称');
      return;
    }

    setSaving(true);
    try {
      const content = generateContent();
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contractName,
          type: template?.type || '其他',
          content: content,
          tags: [template?.industry, '模板生成', versions.length > 1 ? 'AI定制' : ''].filter(Boolean),
          remark: `基于模板"${template?.name}"生成${versions.length > 1 ? '，经AI定制调整' : ''}`,
        }),
      });

      const data = await res.json();

      if (data.id || data.data?.id) {
        const contractId = data.id || data.data?.id;
        toast.success('合同已生成');
        router.push(`/dashboard/contracts/${contractId}`);
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error: any) {
      toast.error('保存异常: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">模板不存在</p>
        <Button variant="link" onClick={() => router.push('/dashboard/templates')}>
          返回模板列表
        </Button>
      </div>
    );
  }

  return (
      <div className="flex flex-col -mx-4 lg:-mx-6 -mt-6 min-h-[calc(100vh-120px)]">
        {/* 顶部操作栏 */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 lg:px-8 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/templates')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1 max-w-[200px] sm:max-w-none">
                <h1 className="text-base font-semibold text-slate-800 truncate">使用模板生成合同</h1>
                <p className="text-xs text-slate-500 truncate">「{template.name}」</p>
              </div>
              {hasVariables && (
                <Badge variant="outline" className="ml-1 sm:ml-2 shrink-0">
                  <Sparkles className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="hidden sm:inline">{filledCount}/{variableNames.length} 项已填写</span>
                  <span className="sm:hidden">{filledCount}/{variableNames.length}</span>
                </Badge>
              )}
              {versions.length > 1 && (
                <Badge className="ml-1 bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 shrink-0">
                  <Bot className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">AI已调整 {versions.length - 1} 次</span>
                  <span className="sm:hidden">AI {versions.length - 1}</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={safeToggleAiPanel}
                className={cn(
                  aiPanelOpen && 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                )}
              >
                <Sparkles className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">AI 智能调整</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const emptyVars = variableNames.filter(k => !variables[k].trim());
                  if (emptyVars.length > 0) {
                    toast.info(`还有 ${emptyVars.length} 项未填写：${emptyVars.slice(0, 3).join('、')}${emptyVars.length > 3 ? '...' : ''}`);
                    return;
                  }
                  toast.success('所有变量已填写完成');
                }}
              >
                <CheckCircle2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">检查填写</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSaveContract}
                disabled={saving || aiLoading}
                title={aiLoading ? 'AI正在处理中，请稍候...' : ''}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" /><span className="hidden sm:inline">生成中...</span></>
                ) : (
                  <><Wand2 className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">生成合同</span></>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 主体：三栏布局 */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-4 lg:py-6 gap-4 lg:gap-6">
          {/* 左侧：填写表单 */}
          <div className="w-full lg:w-[380px] shrink-0 space-y-4 order-1">
            {/* 合同基本信息卡 */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  合同基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">合同名称</Label>
                  <Input
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="输入合同名称"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">合同类型</Label>
                    <div className="mt-1 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                      {template.type || '通用'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">所属行业</Label>
                    <div className="mt-1 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                      {template.industry || '通用'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 变量填写 - 分组 Tab */}
            {hasVariables ? (
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <FileSignature className="h-4 w-4 text-violet-600" />
                    </div>
                    填写合同要素
                    <Badge variant="outline" className="ml-auto text-xs">
                      {filledCount}/{variableNames.length}
                    </Badge>
                  </CardTitle>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={activeGroup} onValueChange={setActiveGroup} className="w-full">
                    <div className="px-3 border-b border-slate-100">
                      <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap justify-start">
                        {Object.keys(groupedVariables).map(group => (
                          <TabsTrigger
                            key={group}
                            value={group}
                            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 text-xs px-3 py-2 rounded-lg data-[state=active]:shadow-none"
                          >
                            {group}
                            <Badge
                              variant="outline"
                              className="ml-1.5 text-[10px] px-1 py-0 h-4 min-w-4 justify-center data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:border-blue-200"
                            >
                              {groupedVariables[group]?.length || 0}
                            </Badge>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    {Object.entries(groupedVariables).map(([group, vars]) => (
                      <TabsContent key={group} value={group} className="p-4 mt-0 space-y-3">
                        {vars.map((name) => {
                          const isHighlighted = highlightedVar === name;
                          return (
                            <div
                              key={name}
                              className={cn(
                                'transition-all duration-300',
                                isHighlighted && 'ring-2 ring-blue-400 ring-offset-2 rounded-lg'
                              )}
                            >
                              <Label className="text-xs text-slate-500 flex items-center gap-1.5">
                                {getVariableIcon(name)}
                                {name}
                                {variables[name].trim() && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                                )}
                              </Label>
                              <Input
                                value={variables[name]}
                                onChange={(e) => setVariables(prev => ({ ...prev, [name]: e.target.value }))}
                                placeholder={`请输入${name}`}
                                className="mt-1"
                              />
                            </div>
                          );
                        })}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-100 shadow-sm">
                <CardContent className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">此模板没有需要填写的变量</p>
                  <p className="text-xs text-slate-400 mt-1">可直接在右侧预览并生成合同</p>
                </CardContent>
              </Card>
            )}

            {/* 版本历史 */}
            {versions.length > 1 && (
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    </div>
                    版本历史
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {versions.slice().reverse().map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleRevertToVersion(v)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between',
                        currentContent === v.content
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      <span>{v.label}</span>
                      <span className="text-slate-400">
                        {v.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-slate-500 hover:text-rose-600 mt-1"
                    onClick={handleRevertToOriginal}
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    恢复原始模板
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 操作指引 */}
            <Card className="border-blue-100 bg-blue-50/50 shadow-sm">
              <CardContent className="py-4">
                <div className="text-xs text-blue-700 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    操作指引
                  </p>
                  <ol className="space-y-1.5 ml-5 list-decimal text-blue-600/80">
                    <li>点击顶部「AI智能调整」打开助手</li>
                    <li>告诉AI您的需求或使用快捷指令</li>
                    <li>按分组填写合同要素（甲乙方、金额等）</li>
                    <li>点击右侧预览中的变量可快速定位</li>
                    <li>确认无误后点击"生成合同"</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中间：实时预览 */}
          <div className="flex-1 min-w-0 order-0 lg:order-2">
            <Card className="border-slate-100 shadow-sm lg:h-full flex flex-col">
              <CardHeader className="pb-3 shrink-0 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-emerald-600" />
                    </div>
                    合同预览
                    <Badge variant="outline" className="ml-2 text-xs font-normal">
                      <Clock className="h-3 w-3 mr-1" />
                      实时更新
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Award className="h-3.5 w-3.5" />
                    标准A4格式
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div
                  ref={previewRef}
                  className="bg-white shadow-lg border border-slate-200 rounded-sm mx-auto max-w-2xl p-6 lg:p-12 min-h-[400px] lg:min-h-[800px]"
                  style={{ fontFamily: '"SimSun", "宋体", serif' }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-slate-900 tracking-wide">
                      {contractName || '合同名称'}
                    </h2>
                  </div>
                  <div className="text-sm text-slate-700 leading-loose whitespace-pre-wrap">
                    {renderHighlightedContent(previewContent, variables, handleVarClick)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：AI调整面板 */}
          {/* 桌面端：侧边栏 */}
          <div
            className={cn(
              'hidden lg:block shrink-0 transition-all duration-300 ease-out overflow-hidden',
              aiPanelOpen ? 'w-[380px] opacity-100' : 'w-0 opacity-0'
            )}
          >
            <Card className="border-violet-100 shadow-sm h-full flex flex-col bg-gradient-to-b from-violet-50/30 to-white">
              <CardHeader className="pb-3 shrink-0 border-b border-violet-100 bg-white/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    AI 合同定制助手
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-600"
                    onClick={() => safeToggleAiPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2.5',
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center',
                        msg.role === 'user'
                          ? 'bg-blue-100'
                          : 'bg-gradient-to-br from-violet-500 to-indigo-500'
                      )}>
                        {msg.role === 'user' ? (
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>
                      <div className={cn(
                        'max-w-[270px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-tr-md'
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-md shadow-sm'
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.changes && msg.changes.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                            <p className="text-xs font-medium text-slate-500 mb-1.5">修改内容：</p>
                            {msg.changes.map((change, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{change}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          <span className="text-sm text-slate-500">AI正在调整中...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="px-4 py-3 border-t border-violet-100 bg-white/60 backdrop-blur-sm">
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-2 px-1">快捷指令</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
                        onClick={() => handleQuickAction(action.id)}
                        disabled={aiLoading}
                        title={`点击让AI${action.label}`}
                      >
                        <action.icon className="h-3 w-3 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiAdjust(chatInput);
                      }
                    }}
                    placeholder="描述您的需求，比如：增加保密条款..."
                    className="h-9 text-sm"
                    disabled={aiLoading}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAiAdjust(chatInput)}
                    disabled={aiLoading || !chatInput.trim()}
                    className="h-9 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* 移动端：全屏覆盖 */}
          {aiPanelOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex flex-col">
              <div className="bg-white flex flex-col h-full rounded-none">
                <div className="px-4 py-3 border-b border-violet-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">AI 合同定制助手</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500"
                    onClick={() => safeToggleAiPanel(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2.5',
                          msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center',
                          msg.role === 'user'
                            ? 'bg-blue-100'
                            : 'bg-gradient-to-br from-violet-500 to-indigo-500'
                        )}>
                          {msg.role === 'user' ? (
                            <User className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        <div className={cn(
                          'max-w-[250px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-tr-md'
                            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-md shadow-sm'
                        )}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.changes && msg.changes.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                              <p className="text-xs font-medium text-slate-500 mb-1.5">修改内容：</p>
                              {msg.changes.map((change, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{change}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500">
                          <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                            <span className="text-sm text-slate-500">AI正在调整中...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-violet-100 shrink-0">
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2 px-1">快捷指令</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_ACTIONS.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2.5 border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
                          onClick={() => handleQuickAction(action.id)}
                          disabled={aiLoading}
                        >
                          <action.icon className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiAdjust(chatInput);
                        }
                      }}
                      placeholder="描述您的需求，比如：增加保密条款..."
                      className="h-9 text-sm"
                      disabled={aiLoading}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAiAdjust(chatInput)}
                      disabled={aiLoading || !chatInput.trim()}
                      className="h-9 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

function renderHighlightedContent(
  content: string,
  variables: Record<string, string>,
  onVarClick: (name: string) => void
) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  const braceRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = braceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${keyIndex++}`}>{content.slice(lastIndex, match.index)}</span>);
    }

    const varName = match[1].trim();
    const value = variables[varName];

    parts.push(
      <button
        key={`var-${keyIndex++}`}
        onClick={() => onVarClick(varName)}
        className={cn(
          'inline-block px-1.5 py-0.5 rounded mx-0.5 text-xs font-medium transition-colors cursor-pointer',
          value
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 animate-pulse'
        )}
        title={`点击填写：${varName}`}
      >
        {value || `{{${varName}}}`}
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={`text-${keyIndex++}`}>{content.slice(lastIndex)}</span>);
  }

  if (parts.length === 0) {
    return content;
  }

  return parts;
}
