import type { Database } from '@/types/database.types';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * サーバー(Server Component / Server Action / Route Handler)用クライアント。
 * Cookie ベースでセッションを引き継ぎ、Anon Key + RLS で動作する。
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component から呼ばれた場合 set は失敗する。
            // セッション更新は middleware が担うため握りつぶしてよい。
          }
        },
      },
    },
  );
}
