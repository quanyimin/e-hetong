import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: 获取模板列表（支持按 industry 过滤）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');

    const where: Record<string, unknown> = { isOfficial: true };
    if (industry && industry !== 'null') {
      where.industry = industry;
    } else if (industry === 'null') {
      where.industry = null;
    }

    const templates = await prisma.contractTemplate.findMany({
      where: where as any,
      orderBy: [{ industry: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[模板API] 错误:', error);
    return NextResponse.json({ code: 1, message: '获取模板列表失败' }, { status: 500 });
  }
}
