import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/search?q=关键词&limit=20
// 模糊搜索合同（名称/甲方/乙方/tags/全文），按相似度降序排列
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 从 Cookie 获取当前用户 ID
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 同时搜索单个字段和 searchText 全文索引
    const contracts = await prisma.contract.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q } },
          { partyA: { contains: q } },
          { partyB: { contains: q } },
          { tags: { contains: q } },
          { summary: { contains: q } },
          { searchText: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        partyA: true,
        partyB: true,
        amount: true,
        type: true,
        status: true,
        endDate: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // 计算相似度得分 + 高亮标题
    const qLower = q.toLowerCase();
    const qEscaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = new RegExp(`(${qEscaped})`, 'gi');

    const results = contracts.map((c) => {
      let score = 0;
      const fields = [c.name, c.partyA, c.partyB].filter(Boolean);
      for (const field of fields) {
        const fLower = field!.toLowerCase();
        if (fLower === qLower) score = Math.max(score, 1.0);
        else if (fLower.startsWith(qLower)) score = Math.max(score, 0.8);
        else if (fLower.includes(qLower)) score = Math.max(score, 0.5);
      }

      const highlightedName = c.name
        ? c.name.replace(highlightRegex, '<mark>$1</mark>')
        : '';

      return {
        id: c.id,
        title: c.name || '',
        highlightedTitle: highlightedName,
        partyA: c.partyA || '',
        partyB: c.partyB || '',
        amount: c.amount || 0,
        status: c.status || 'ACTIVE',
        direction: c.type || 'OTHER',
        score,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('[Search API] 搜索错误:', error);
    return NextResponse.json({ success: false, error: '搜索失败' }, { status: 500 });
  }
}
