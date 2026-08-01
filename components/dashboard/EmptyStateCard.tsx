'use client';

import Link from 'next/link';
import {
  Upload, BookOpen, Wand2, PenTool, Sparkles, ArrowRight,
} from 'lucide-react';
import type { GuideCard } from '@/lib/empty-state-config';

// ============ 图标映射 ============
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Upload,
  BookOpen,
  Wand2,
  PenTool,
  Sparkles,
};

// ============ 单张引导卡片 ============
interface GuideCardItemProps {
  card: GuideCard;
}

function GuideCardItem({ card }: GuideCardItemProps) {
  const Icon = ICON_MAP[card.icon] || Sparkles;

  return (
    <Link href={card.href}>
      <div className="bg-white rounded-xl border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all p-3.5 h-full flex flex-col">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-2`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-800">{card.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 flex-1">{card.desc}</p>
        <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-2">
          <span>立即开始</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// ============ 空状态引导卡片组 ============
interface EmptyStateCardProps {
  cards: GuideCard[];
}

export function EmptyStateCard({ cards }: EmptyStateCardProps) {
  return (
    <div className="grid grid-cols-5 gap-3 mt-4" role="region" aria-label="空状态引导卡片">
      {cards.map((card, index) => (
        <GuideCardItem key={index} card={card} />
      ))}
    </div>
  );
}

// ============ AI 模式空状态横幅 ============
interface EmptyStateBannerProps {
  message?: string;
}

export function EmptyStateBanner({ message }: EmptyStateBannerProps) {
  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
      <p className="text-xs text-slate-600 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <span>
          {message || (
            <>
              欢迎使用！当前为空状态，建议从
              <Link href="/dashboard/upload" className="text-indigo-600 font-medium mx-1 hover:underline">上传第一份合同</Link>
              或
              <Link href="/dashboard/contracts/generate" className="text-indigo-600 font-medium mx-1 hover:underline">AI 生成合同</Link>
              快速开始
            </>
          )}
        </span>
      </p>
    </div>
  );
}

export default EmptyStateCard;
