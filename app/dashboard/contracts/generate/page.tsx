'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import {
  Wand2, FileText, Loader2, AlertCircle, RotateCcw,
  Save, Eye, Edit3, Building2, UtensilsCrossed, LayoutDashboard, ArrowLeft,
} from 'lucide-react';
import { getContractTypes, getFieldConfig, getContractTypeName, getIndustryName, INDUSTRY_CONFIGS } from '@/lib/industry-config';

// 行业选项（前端展示用，与后端 INDUSTRY_CONFIGS 对应）
const INDUSTRIES = [
  { code: 'GENERAL', name: '通用', icon: LayoutDashboard, color: 'text-gray-600 bg-gray-50' },
  { code: 'LANDLORD', name: '房东/租赁', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { code: 'RESTAURANT', name: '餐饮门店', icon: UtensilsCrossed, color: 'text-orange-600 bg-orange-50' },
];

function getIndustryIcon(industryCode: string) {
  return INDUSTRIES.find(i => i.code === industryCode)?.icon || LayoutDashboard;
}

export default function GenerateContractPage() {
  const router = useRouter();
  const { tenant } = useAuth();

  const [step, setStep] = useState<'select' | 'form' | 'generating' | 'result'>('select');
  const [industry, setIndustry] = useState('GENERAL');
  const [contractType, setContractType] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [additionalReqs, setAdditionalReqs] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 获取当前行业下的合同类型列表
  const currentTypes = useMemo(() => {
    return getContractTypes(industry === 'GENERAL' ? null : industry);
  }, [industry]);

  // 获取当前合同类型的字段配置
  const currentFields = useMemo(() => {
    if (!contractType) return [];
    return getFieldConfig(industry === 'GENERAL' ? null : industry, contractType);
  }, [industry, contractType]);

  function selectIndustry(code: string) {
    setIndustry(code);
    setContractType('');
    setStep('select');
  }

  function selectType(code: string) {
    setContractType(code);
    const fields = getFieldConfig(industry === 'GENERAL' ? null : industry, code);
    const defaults: Record<string, string> = {};
    fields.forEach(f => { defaults[f.key] = ''; });
    setFormValues(defaults);
    setStep('form');
  }

  function updateField(key: string, value: string) {
    setFormValues(prev => ({ ...prev, [key]: value }));
  }

  // 验证必填字段
  function validateFields(): boolean {
    for (const f of currentFields) {
      if (f.required && !formValues[f.key]?.trim()) {
        setError(`请填写「${f.label}」`);
        return false;
      }
    }
    return true;
  }

  async function handleGenerate() {
    setError(null);
    if (!validateFields()) return;

    setStep('generating');

    try {
      const contractTypeName = getContractTypeName(industry === 'GENERAL' ? null : industry, contractType);

      const res = await fetch('/api/ai/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry === 'GENERAL' ? null : industry,
          contractType,
          parameters: formValues,
          additionalRequirements: additionalReqs || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '生成失败');
      }

      setGeneratedTitle(data.data.title);
      setGeneratedContent(data.data.content);
      setEditContent(data.data.content);
      setStep('result');
    } catch (e: any) {
      setError(e.message || '生成失败，请重试');
      setStep('form');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const tenantId = tenant?.tenantId;
      if (!tenantId) {
        throw new Error('未选择主体，请先选择主体后重试');
      }

      const payload: Record<string, any> = {
        tenantId,
        name: generatedTitle,
        type: contractType,
        partyA: formValues.partyA || '',
        partyB: formValues.partyB || '',
        amount: formValues.amount ? parseFloat(formValues.amount) : undefined,
        startDate: formValues.startDate || undefined,
        endDate: formValues.endDate || undefined,
        ocrText: editMode ? editContent : generatedContent,
        source: 'GENERATE',
        tags: [`AI生成`, getContractTypeName(industry === 'GENERAL' ? null : industry, contractType)],
      };

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.code !== 0) {
        throw new Error(result.message || '保存失败');
      }

      router.push(`/dashboard/contracts/${result.data.id}`);
    } catch (e: any) {
      setError(e.message || '保存失败，请重试');
    }
    setSaving(false);
  }

  // ==================== 步骤1：选择行业和合同类型 ====================
  if (step === 'select') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">AI 合同生成</h1>
          <p className="text-sm text-muted-foreground mt-1">选择行业和合同类型，AI 为您自动生成专业合同</p>
        </div>

        {/* 选择行业 */}
        <Card>
          <CardHeader><CardTitle className="text-lg">1. 选择行业</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {INDUSTRIES.map(ind => {
                const Icon = ind.icon;
                return (
                  <button key={ind.code} onClick={() => setIndustry(ind.code)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all ${
                      industry === ind.code ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted hover:border-muted-foreground/30'
                    }`}>
                    <Icon className={`h-5 w-5 ${ind.color.split(' ')[0]}`} />
                    <span className="font-medium">{ind.name}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 选择合同类型 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. 选择合同类型</CardTitle>
            <CardDescription>已选择：{INDUSTRIES.find(i => i.code === industry)?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentTypes.map(ct => (
                <button key={ct.code} onClick={() => selectType(ct.code)}
                  className="text-left p-4 rounded-xl border border-muted hover:border-primary/40 hover:shadow-sm transition-all group">
                  <p className="font-medium group-hover:text-primary transition-colors">{ct.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ct.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== 步骤2：填写参数表单 ====================
  if (step === 'form') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              AI 生成：{getContractTypeName(industry === 'GENERAL' ? null : industry, contractType)}
            </h1>
            <p className="text-xs text-muted-foreground">
              行业：{INDUSTRIES.find(i => i.code === industry)?.name}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">填写合同参数</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {currentFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={formValues[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder || `请输入${field.label}`}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formValues[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">请选择</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    value={formValues[field.key] || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder || `请输入${field.label}`}
                  />
                )}
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>附加要求（可选）</Label>
              <Textarea
                value={additionalReqs}
                onChange={e => setAdditionalReqs(e.target.value)}
                placeholder="如：需要增加保密条款、需要约定每年递增5%..."
                rows={2}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <Button onClick={handleGenerate} size="lg" className="w-full gap-2">
              <Wand2 className="h-5 w-5" /> AI 生成合同
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== 步骤3：生成中 ====================
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
          <div className="relative bg-primary text-white p-4 rounded-full">
            <Wand2 className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2">AI 正在生成合同...</h2>
        <p className="text-sm text-muted-foreground mb-2">根据您输入的信息，自动编写专业合同条款</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm max-w-md">{error}</div>
        )}
      </div>
    );
  }

  // ==================== 步骤4：结果展示 ====================
  const ctName = getContractTypeName(industry === 'GENERAL' ? null : industry, contractType);
  const industryName = INDUSTRIES.find(i => i.code === industry)?.name || '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setStep('form'); setGeneratedContent(''); setGeneratedTitle(''); }} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> 修改参数
          </Button>
          <div>
            <h1 className="text-xl font-bold">{generatedTitle}</h1>
            <p className="text-xs text-muted-foreground">AI 生成 · {ctName} · {industryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditMode(!editMode); if (!editMode) setEditContent(generatedContent); }} className="gap-1">
            {editMode ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {editMode ? '预览' : '编辑'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? '保存中...' : '保存为合同'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          {editMode ? (
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[600px] font-mono text-sm leading-relaxed"
            />
          ) : (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {generatedContent}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => { setStep('form'); setGeneratedContent(''); setGeneratedTitle(''); setEditContent(''); setEditMode(false); }} className="gap-2">
          <RotateCcw className="h-4 w-4" /> 重新生成
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '保存中...' : '保存为正式合同'}
        </Button>
      </div>
    </div>
  );
}
