import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Auth 回调处理
 * OAuth 登录后 Supabase 会重定向到该路由
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // TODO: 使用 Supabase Auth 交换 code 为 session
    // const supabase = await createSupabaseServerClient();
    // const { error } = await supabase.auth.exchangeCodeForSession(code);
    // if (!error) {
    //   return NextResponse.redirect(`${origin}${next}`);
    // }

    // 模拟成功回调
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 无 code 参数，重定向到登录页
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
