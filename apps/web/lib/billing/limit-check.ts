import 'server-only';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkCustomerLimit } from './plans';

/**
 * テナントの顧客数上限に対する空き状況を返す。
 * RLS スコープの server クライアントを渡すこと（自テナントのみ集計）。
 */
export async function customerCapacity(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  adding = 1,
): Promise<{ allowed: boolean; limit: number | null; remaining: number | null; count: number }> {
  const [{ count }, { data: sub }] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('plan, status').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  const currentCount = count ?? 0;
  const result = checkCustomerLimit(sub?.plan, currentCount, adding);
  return { ...result, count: currentCount };
}

export function limitMessage(limit: number): string {
  return `フリートライアルは顧客 ${limit} 件までです。続けるにはプランをアップグレードしてください（設定 → プラン）。`;
}
