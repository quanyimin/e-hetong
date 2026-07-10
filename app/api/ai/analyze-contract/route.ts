import { NextRequest, NextResponse } from 'next/server';

// POST /api/ai/analyze-contract
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ success: false, error: '缺少合同内容' }, { status: 400 });
    }
    
    // 实际项目中这里调用大模型API
    // 目前先用解析逻辑模拟
    const lines = content.split('\n').filter(Boolean);
    const mockResult: Record<string, string> = {
      name: '',
      partyA: '',
      partyB: '',
      amount: '',
      amountText: '',
      signDate: '',
      startDate: '',
      endDate: '',
      contractType: '',
      paymentMethod: '',
    };

    // 简单规则提取
    lines.forEach((line: string) => {
      if (line.includes('合同名称') || line.includes('合同编号') || (line.includes('合同') && line.includes('协议'))) {
        if (!mockResult.name) mockResult.name = line.replace(/合同名称[：:为\s]*/g, '').trim();
      }
      if (line.includes('甲方') && line.length < 50) mockResult.partyA = line.replace(/甲方[：:为(名称)]*\s*/g, '').trim();
      if (line.includes('乙方') && line.length < 50) mockResult.partyB = line.replace(/乙方[：:为(名称)]*\s*/g, '').trim();
      if (line.includes('金额') || line.includes('价款') || line.includes('租金') || line.includes('价格')) {
        const match = line.match(/\d+(\.\d+)?/);
        if (match) mockResult.amount = match[0];
        mockResult.amountText = line.replace(/.*(金额|价款|租金|价格)[：:为\s]*/, '').trim();
      }
      if (line.includes('签订') || line.includes('签署')) {
        const dateMatch = line.match(/\d{4}[-年]\d{1,2}[-月]\d{1,2}/);
        if (dateMatch) mockResult.signDate = dateMatch[0].replace(/年/g, '-').replace(/月/g, '-');
      }
    });

    return NextResponse.json({
      success: true,
      data: { fields: mockResult },
    });
  } catch {
    return NextResponse.json({ success: false, error: '分析失败' });
  }
}
