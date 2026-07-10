'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, RefreshCw, Check, X, AlertCircle, FileText, Download, Inbox, Settings, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function EmailImportPage() {
  const [tab, setTab] = useState('inbox');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    email: '',
    imapServer: 'imap.qq.com',
    imapPort: '993',
    password: '',
    filterKeyword: '合同,协议,agreement,contract',
  });

  useEffect(() => {
    fetch('/api/email/configure').then(r => r.json()).then(d => {
      if (d.config) {
        setConfig(d.config);
        setForm(f => ({ ...f, email: d.config.email || '', imapServer: d.config.imapServer || 'imap.qq.com', imapPort: String(d.config.imapPort || 993), filterKeyword: d.config.filterKeyword || '合同,协议' }));
      }
    }).catch(console.error).finally(() => setLoading(false));

    fetch('/api/email/fetch').then(r => r.json()).then(d => {
      setImportHistory(d.imports || []);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/email/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '邮箱配置已保存' });
        setConfig({ ...form, password: '******' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    }
    setSaving(false);
  }

  async function handleFetch() {
    setFetching(true);
    setMessage(null);
    try {
      const res = await fetch('/api/email/fetch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
        setMessage({ type: 'success', text: `找到 ${data.total} 封邮件` });
        setTab('inbox');
      } else {
        setMessage({ type: 'error', text: data.error || '抓取失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '抓取失败，请重试' });
    }
    setFetching(false);
  }

  async function handleImportAsContract(email: any) {
    const key = email.reminderId || email.messageId;
    setImportingId(key);
    setMessage(null);
    try {
      const res = await fetch('/api/email/import-as-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: email.subject,
          ocrText: email.ocrText || '',
          from: email.from,
          date: email.date,
          attachments: email.attachments,
          reminderId: email.reminderId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `「${email.subject}」已导入为合同` });
        // 刷新导入历史
        fetch('/api/email/fetch').then(r => r.json()).then(d => {
          setImportHistory(d.imports || []);
        }).catch(() => {});
      } else {
        setMessage({ type: 'error', text: data.error || '导入失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '导入失败，请重试' });
    }
    setImportingId(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">邮箱导入合同</h1>
          <p className="text-sm text-muted-foreground mt-1">配置邮箱后，自动抓取邮件中的合同附件，AI 识别归档</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" /> 邮件列表
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> 邮箱设置
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" /> 导入历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleFetch} disabled={fetching || !config} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
              {fetching ? '抓取中...' : '抓取邮件'}
            </Button>
            {!config && (
              <span className="text-sm text-muted-foreground">请先在「邮箱设置」中配置IMAP</span>
            )}
          </div>

          {emails.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">暂无邮件</p>
              <p className="text-sm text-muted-foreground">点击「抓取邮件」从已配置的邮箱中获取合同附件</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {emails.map((email, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-50">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">{email.from} &middot; {new Date(email.date).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {email.attachments?.map((att: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs">
                              <Download className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{att.filename}</span>
                              <Badge variant="outline" className="text-[10px] px-1">
                                {(att.size / 1024).toFixed(0)}KB
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 shrink-0"
                        onClick={() => handleImportAsContract(email)}
                        disabled={importingId === (email.reminderId || email.messageId)}
                      >
                        {importingId === (email.reminderId || email.messageId) ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        {importingId === (email.reminderId || email.messageId) ? '导入中...' : '导入合同'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">IMAP 邮箱配置</CardTitle>
                  <CardDescription>支持 QQ邮箱、163邮箱、Gmail 等（需开启IMAP并获取应用专用密码）</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>邮箱地址</Label>
                      <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>邮箱密码 / 授权码</Label>
                      <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="应用专用密码" />
                    </div>
                    <div className="space-y-2">
                      <Label>IMAP 服务器</Label>
                      <Input value={form.imapServer} onChange={e => setForm(f => ({ ...f, imapServer: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>端口</Label>
                      <Input value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>附件关键词过滤（逗号分隔）</Label>
                    <Input value={form.filterKeyword} onChange={e => setForm(f => ({ ...f, filterKeyword: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">只有标题含这些关键词的邮件才会被导入</p>
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? '保存中...' : '保存配置'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-2">📌 常见邮箱 IMAP 设置</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><b>QQ邮箱</b>：imap.qq.com : 993 → 需开启IMAP，使用授权码</p>
                    <p><b>163邮箱</b>：imap.163.com : 993 → 需开启IMAP，使用授权码</p>
                    <p><b>Outlook</b>：outlook.office365.com : 993</p>
                    <p><b>Gmail</b>：imap.gmail.com : 993 → 需开启两步验证+应用专用密码</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {importHistory.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无导入记录</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {importHistory.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{item.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(item.createdAt).toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
