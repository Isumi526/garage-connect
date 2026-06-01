import 'server-only';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Supa = SupabaseClient<Database>;

/** Stripe price ID → 自社プラン ID の対応（環境変数で設定） */
export function planIdForPrice(priceId: string | null | undefined): 'standard' | 'pro' {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return 'standard';
}

/** Stripe の購読状態を subscriptions テーブルへ反映する（Webhook から呼ぶ） */
export async function upsertSubscriptionFromStripe(
  admin: Supa,
  params: {
    tenantId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    plan: 'standard' | 'pro';
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  },
): Promise<void> {
  await admin
    .from('subscriptions')
    .update({
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      plan: params.plan,
      status: params.status,
      current_period_start: params.currentPeriodStart,
      current_period_end: params.currentPeriodEnd,
    })
    .eq('tenant_id', params.tenantId);
}

/** 購読解約・期限切れ時にトライアル相当へ戻す */
export async function downgradeSubscription(admin: Supa, tenantId: string): Promise<void> {
  await admin
    .from('subscriptions')
    .update({ plan: 'free_trial', status: 'canceled' })
    .eq('tenant_id', tenantId);
}

/** tenant_id を Stripe customer/subscription から逆引きする */
export async function findTenantByStripeCustomer(
  admin: Supa,
  stripeCustomerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('subscriptions')
    .select('tenant_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}
