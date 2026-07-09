import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 服务端客户端（使用 Service Role Key，可在 Server Components / API Route 中使用）
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase 客户端端（使用 Anon Key）
 */
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 创建带 Session 的 Supabase 客户端（用于 Server Components）
 */
export async function createSupabaseServerClient() {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies().set(name, value, options);
        },
        remove(name: string, options: any) {
          cookies().set(name, '', options);
        },
      },
    }
  );
}
