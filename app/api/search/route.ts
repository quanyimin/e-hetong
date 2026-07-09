import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 自然语言 → SQL 过滤条件（简单 NLP 解析）
function parseNaturalLanguage(q: string): {
  textFilter: string;
  statusFilter?: string;
  directionFilter?: string;
  typeFilter?: string;
  daysRange?: number;
} {
  const lower = q.toLowerCase();
  let textFilter = q;
  let statusFilter: string | undefined;
  let directionFilter: string | undefined;
  let typeFilter: string | undefined;
  let daysRange: number | undefined;

  // 状态过滤
  if (lower.includes('逾期') || lower.includes('过期')) {
    statusFilter = 'OVERDUE';
    textFilter = textFilter.replace(/逾期|过期/g, '').trim();
  } else if (lower.includes('已付') || lower.includes('结清')) {
    statusFilter = 'PAID';
    textFilter = textFilter.replace(/已付|结清/g, '').trim();
  } else if (lower.includes('待付') || lower.includes('待收') || lower.includes('未付')) {
    statusFilter = 'PENDING';
    textFilter = textFilter.replace(/待付|待收|未付/g, '').trim();
  }

  // 方向过滤
  if (lower.includes('收款') || lower.includes('收入') || lower.includes('应收')) {
    directionFilter = 'INCOME';
    textFilter = textFilter.replace(/收款|收入|应收/g, '').trim();
  } else if (lower.includes('付款') || lower.includes('支出') || lower.includes('应付')) {
    directionFilter = 'EXPENSE';
    textFilter = textFilter.replace(/付款|支出|应付/g, '').trim();
  }

  // 时间范围
  if (lower.includes('本月')) {
    daysRange = 30;
    textFilter = textFilter.replace(/本月/g, '').trim();
  } else if (lower.includes('本周')) {
    daysRange = 7;
    textFilter = textFilter.replace(/本周/g, '').trim();
  } else if (lower.includes('本季度') || lower.includes('本季')) {
    daysRange = 90;
    textFilter = textFilter.replace(/本季度|本季/g, '').trim();
  }

  // 合同类型
  if (lower.includes('租') || lower.includes('租赁')) {
    typeFilter = 'lease';
    textFilter = textFilter.replace(/租赁|租/g, '').trim();
  } else if (lower.includes('采购') || lower.includes('买卖') || lower.includes('销售')) {
    typeFilter = textFilter.includes('采购') ? 'purchase' : 'sale';
    textFilter = textFilter.replace(/采购|买卖|销售/g, '').trim();
  } else if (lower.includes('劳务') || lower.includes('劳动') || lower.includes('用工') || lower.includes('工资')) {
    typeFilter = 'labor';
    textFilter = textFilter.replace(/劳务|劳动|用工|工资/g, '').trim();
  }

  return { textFilter: textFilter.replace(/\s+/g, ' ').trim(), statusFilter, directionFilter, typeFilter, daysRange };
}

// GET /api/search?q=关键词&mode=fuzzy|semantic&scope=contract|all&limit=20
// 三层搜索：
//   fuzzy   — 关键词模糊匹配（默认）
//   semantic — 自然语言语义搜索（AI 增强）
//   fulltext — 全文 searchText 索引
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const mode = searchParams.get('mode') || 'fuzzy';
    const scope = searchParams.get('scope') || 'all';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // ========== 语义模式：自然语言解析 ==========
    let parsedFilter;
    if (mode === 'semantic') {
      parsedFilter = parseNaturalLanguage(q);
    }

    const searchQ = (mode === 'semantic' && parsedFilter?.textFilter) || q;

    // ========== 搜索合同 ==========
    const contractWhere: Record<string, unknown> = { userId };

    if (mode === 'semantic' && parsedFilter) {
      const OR: Record<string, unknown>[] = [];
      if (searchQ) {
        OR.push(
          { name: { contains: searchQ } },
          { partyA: { contains: searchQ } },
          { partyB: { contains: searchQ } },
          { searchText: { contains: searchQ } },
          { summary: { contains: searchQ } },
        );
      }
      if (OR.length > 0) contractWhere.OR = OR;
      if (parsedFilter.statusFilter) contractWhere.status = parsedFilter.statusFilter;
      if (parsedFilter.directionFilter) contractWhere.direction = parsedFilter.directionFilter;
      if (parsedFilter.typeFilter) contractWhere.type = parsedFilter.typeFilter;
      if (parsedFilter.daysRange) {
        const since = new Date(Date.now() - parsedFilter.daysRange * 24 * 60 * 60 * 1000);
        contractWhere.createdAt = { gte: since };
      }
    } else {
      contractWhere.OR = [
        { name: { contains: searchQ } },
        { partyA: { contains: searchQ } },
        { partyB: { contains: searchQ } },
        { tags: { contains: searchQ } },
        { summary: { contains: searchQ } },
        { searchText: { contains: searchQ } },
      ];
    }

    const contracts = await prisma.contract.findMany({
      where: contractWhere as any,
      select: {
        id: true,
        name: true,
        partyA: true,
        partyB: true,
        amount: true,
        type: true,
        status: true,
        endDate: true,
        direction: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // 高亮处理
    const qEscaped = searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = new RegExp(`(${qEscaped})`, 'gi');
    const qLower = searchQ.toLowerCase();

    const contractResults = contracts.map((c) => {
      let score = 0;
      const fields = [c.name, c.partyA, c.partyB].filter(Boolean);
      for (const field of fields) {
        const fLower = field!.toLowerCase();
        if (fLower === qLower) score = Math.max(score, 1.0);
        else if (fLower.startsWith(qLower)) score = Math.max(score, 0.8);
        else if (fLower.includes(qLower)) score = Math.max(score, 0.5);
      }

      return {
        id: c.id,
        type: 'contract' as const,
        title: c.name || '',
        highlightedTitle: c.name ? c.name.replace(highlightRegex, '<mark>$1</mark>') : '',
        subtitle: `${c.partyA || ''} ${c.partyB || ''}`.trim() || '无对方信息',
        amount: c.amount || 0,
        status: c.status || 'ACTIVE',
        direction: c.direction || c.type || 'OTHER',
        score,
      };
    });

    contractResults.sort((a, b) => b.score - a.score);

    // ========== 搜索合作方 ==========
    let partnerResults: any[] = [];
    if (scope === 'all' || scope === 'partner') {
      const partners = await prisma.partner.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: searchQ } },
            { company: { contains: searchQ } },
            { phone: { contains: searchQ } },
          ],
        },
        select: { id: true, name: true, company: true, phone: true, type: true, remark: true },
        take: 5,
      });
      partnerResults = partners.map(p => ({
        id: p.id,
        type: 'partner' as const,
        title: p.name,
        highlightedTitle: p.name.replace(highlightRegex, '<mark>$1</mark>'),
        subtitle: p.company || '合作方',
        phone: p.phone,
        score: 0.7,
      }));
    }

    // ========== 搜索资产 ==========
    let assetResults: any[] = [];
    if (scope === 'all' || scope === 'asset') {
      const assets = await prisma.asset.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: searchQ } },
            { identifier: { contains: searchQ } },
            { description: { contains: searchQ } },
          ],
        },
        select: { id: true, name: true, type: true, identifier: true, value: true },
        take: 5,
      });
      assetResults = assets.map(a => ({
        id: a.id,
        type: 'asset' as const,
        title: a.name,
        highlightedTitle: a.name.replace(highlightRegex, '<mark>$1</mark>'),
        subtitle: a.identifier || a.type || '资产',
        value: a.value,
        score: 0.6,
      }));
    }

    const results = [...contractResults, ...partnerResults, ...assetResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ success: true, data: results, mode, total: results.length });
  } catch (error) {
    console.error('[Search API] 搜索错误:', error);
    return NextResponse.json({ success: false, error: '搜索失败' }, { status: 500 });
  }
}
