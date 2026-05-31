import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service Role クライアント（RLS をバイパス）。
 * サーバー側の限定的な用途（招待・Webhook・バッチ）でのみ使用すること。
 * 絶対にクライアントへ露出させない。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
