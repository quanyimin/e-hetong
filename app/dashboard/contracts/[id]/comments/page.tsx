'use client';
// 合同协作 - 评论与标注（collaboration）

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare, Send, Reply, ArrowLeft, FileText,
} from 'lucide-react';

interface CommentUser {
  name: string;
  role?: string;
}

interface Comment {
  id: string;
  user: CommentUser;
  content: string;
  createdAt: string;
  replies?: Comment[];
}

// 模拟评论数据（后续接入后端 API 替换）
const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    user: { name: '张律师', role: '法务审核' },
    content: '第三条违约责任条款建议补充具体违约金计算方式，当前表述过于宽泛，存在争议风险。',
    createdAt: '2026-07-28 10:32',
    replies: [
      {
        id: 'c1-r1',
        user: { name: '李经理', role: '商务' },
        content: '已与对方沟通，对方同意按合同金额 5% 设定违约金，稍后更新条款。',
        createdAt: '2026-07-28 11:05',
      },
    ],
  },
  {
    id: 'c2',
    user: { name: '王财务', role: '财务' },
    content: '付款节点建议调整为"验收合格后 15 个工作日内"，与公司财务流程一致。',
    createdAt: '2026-07-29 14:20',
  },
];

// 头像背景色池
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-cyan-500',
];

function getInitial(name: string) {
  return name?.charAt(0) || '?';
}

function getAvatarColor(name: string) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function nowString() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
}

export default function ContractCommentsPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = (params?.id as string) || '';

  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // 提交评论
  const handleSubmit = () => {
    if (!input.trim()) return;
    const newComment: Comment = {
      id: `c${Date.now()}`,
      user: { name: '当前用户', role: '我' },
      content: input.trim(),
      createdAt: nowString(),
    };
    setComments([newComment, ...comments]);
    setInput('');
  };

  // 提交回复
  const handleReply = (parentId: string) => {
    if (!replyInput.trim()) return;
    const reply: Comment = {
      id: `c${Date.now()}`,
      user: { name: '当前用户', role: '我' },
      content: replyInput.trim(),
      createdAt: nowString(),
    };
    setComments(comments.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    }));
    setReplyInput('');
    setReplyTo(null);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 -mx-4 md:-mx-8">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <h1 className="text-sm font-semibold text-slate-800">合同协作 · 评论与标注</h1>
          </div>
          <Link
            href={`/dashboard/contracts/${contractId}`}
            className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            返回合同详情
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 max-w-3xl mx-auto space-y-4">
        {/* 合同标题卡片 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">合同编号</p>
          <p className="text-sm font-mono text-slate-500 mt-0.5">{contractId}</p>
          <p className="text-xs text-slate-400 mt-2">协作说明</p>
          <p className="text-xs text-slate-600 mt-0.5">
            在此页面进行合同条款评论与标注，支持 @提及成员、回复讨论。所有评论记录留痕，便于团队协作与审计追溯。
          </p>
        </div>

        {/* 评论输入框 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
              我
            </div>
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="发表评论，对合同条款进行标注或讨论..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-slate-400">评论将通知相关协作成员</p>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="h-8 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  发表评论
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 评论列表 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              全部评论
              <span className="text-xs text-slate-400 font-normal">（{comments.length}）</span>
            </h2>
          </div>

          {comments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">暂无评论</p>
              <p className="text-xs text-slate-400 mt-1">发表第一条评论，开启合同协作</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full ${getAvatarColor(comment.user.name)} flex items-center justify-center text-white text-sm font-medium shrink-0`}>
                    {getInitial(comment.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{comment.user.name}</span>
                      {comment.user.role && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {comment.user.role}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">{comment.createdAt}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          setReplyTo(replyTo === comment.id ? null : comment.id);
                          setReplyInput('');
                        }}
                        className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                      >
                        <Reply className="w-3 h-3" />
                        回复
                      </button>
                    </div>

                    {/* 回复列表 */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 pl-3 border-l-2 border-slate-100 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-full ${getAvatarColor(reply.user.name)} flex items-center justify-center text-white text-xs font-medium shrink-0`}>
                              {getInitial(reply.user.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-slate-700">{reply.user.name}</span>
                                {reply.user.role && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    {reply.user.role}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{reply.createdAt}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回复输入框 */}
                    {replyTo === comment.id && (
                      <div className="mt-3 flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                          我
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder={`回复 ${comment.user.name}...`}
                            rows={2}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                          />
                          <div className="flex items-center justify-end gap-2 mt-1.5">
                            <button
                              onClick={() => { setReplyTo(null); setReplyInput(''); }}
                              className="h-7 px-2.5 rounded-lg text-slate-500 text-[11px] hover:bg-slate-100"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleReply(comment.id)}
                              disabled={!replyInput.trim()}
                              className="h-7 px-2.5 rounded-lg bg-blue-500 text-white text-[11px] flex items-center gap-1 disabled:opacity-40 hover:bg-blue-600 transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
