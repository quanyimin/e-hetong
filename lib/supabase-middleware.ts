import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase 中间件集成
 * 用于在 Next.js 中间件中处理 Supabase Auth session
 *
 * 用法: 在 middleware.ts 中调用此函数
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set(name, '');
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, '', options);
        },
      },
    }
  );

  // 刷新 session（重要！确保 token 不过期）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabaseResponse,
    user,
    isLoggedIn: !!user,
    userRole: user?.user_metadata?.role || 'user',
    memberLevel: user?.user_metadata?.member_level || 'free',
  };
}
