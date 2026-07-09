import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, inviteCode } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ success: false, error: '请填写完整信息' });
    }

    const result = await register({ name, email, phone, password, inviteCode });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' });
  }
}
