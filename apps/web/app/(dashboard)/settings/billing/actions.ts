'use server';

import { requireAuth } from '@/lib/auth/context';
import { clientEnv } from '@/lib/env';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/** テナントの Stripe Customer を取得（無ければ作成して保存） */
async function ensureStripeCustomer(
  tenantId: string,
  tenantName: string,
  email: string,
): Promise<string> {
  const supabase = createClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .single();

  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await getStripe().customers.create({
    name: tenantName,
    email,
    metadata: { tenantId },
  });
  await supabase
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('tenant_id', tenantId);
  return customer.id;
}

/** スタンダードプランの Checkout セッションを作成して遷移する */
export async function startCheckout(): Promise<void> {
  const { tenant, email, shopUser } = await requireAuth();
  if (!['owner', 'admin'].includes(shopUser.role)) {
    throw new Error('権限がありません');
  }
  if (!isStripeConfigured()) {
    throw new Error('Stripe が未設定です');
  }
  const priceId = process.env.STRIPE_PRICE_STANDARD;
  if (!priceId) throw new Error('STRIPE_PRICE_STANDARD が未設定です');

  const customerId = await ensureStripeCustomer(tenant.id, tenant.name, email);
  const base = clientEnv.NEXT_PUBLIC_APP_URL;

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { tenantId: tenant.id },
    subscription_data: { metadata: { tenantId: tenant.id } },
    success_url: `${base}/dashboard/settings/billing?success=1`,
    cancel_url: `${base}/dashboard/settings/billing?canceled=1`,
  });

  if (session.url) redirect(session.url);
}

/** Stripe カスタマーポータルへ遷移（支払い方法変更・解約） */
export async function openBillingPortal(): Promise<void> {
  const { tenant } = await requireAuth();
  if (!isStripeConfigured()) throw new Error('Stripe が未設定です');

  const supabase = createClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenant.id)
    .single();
  if (!sub?.stripe_customer_id) throw new Error('課金情報がありません');

  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${clientEnv.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  });
  redirect(portal.url);
}
