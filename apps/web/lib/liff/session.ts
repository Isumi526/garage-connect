import 'server-only';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveLineUserId } from './verify';

export type LiffSession =
  | { status: 'no_user' }
  | { status: 'unlinked'; lineUserId: string }
  | {
      status: 'linked';
      lineUserId: string;
      customer: { id: string; name: string };
      tenantId: string;
    };

/**
 * LIFF リクエストのテナント・LINE ユーザー・顧客紐付けを解決する。
 * line_connections（Phase 3 で作成）を LIFF 側からも参照する。
 */
export async function resolveLiffSession(
  admin: SupabaseClient<Database>,
  tenantId: string,
  accessToken: string | null,
  devUserId?: string | null,
): Promise<LiffSession> {
  const lineUserId = await resolveLineUserId(accessToken, devUserId);
  if (!lineUserId) return { status: 'no_user' };

  const { data: connection } = await admin
    .from('line_connections')
    .select('customer_id, is_blocked')
    .eq('tenant_id', tenantId)
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (!connection || !connection.customer_id) {
    // 友だち追加だけして店舗未紐付け、または未連携
    return { status: 'unlinked', lineUserId };
  }

  const { data: customer } = await admin
    .from('customers')
    .select('id, name')
    .eq('id', connection.customer_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!customer) return { status: 'unlinked', lineUserId };

  return { status: 'linked', lineUserId, customer, tenantId };
}
