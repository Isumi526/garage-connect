import {
  downgradeSubscription,
  findTenantByStripeCustomer,
  planIdForPrice,
  upsertSubscriptionFromStripe,
} from '@/lib/billing/subscription';
import { getStripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

async function syncFromSubscription(sub: Stripe.Subscription, tenantId: string | null) {
  const admin = createAdminClient();
  const resolvedTenant =
    tenantId ?? (await findTenantByStripeCustomer(admin, String(sub.customer)));
  if (!resolvedTenant) return;

  const priceId = sub.items.data[0]?.price.id;
  await upsertSubscriptionFromStripe(admin, {
    tenantId: resolvedTenant,
    stripeCustomerId: String(sub.customer),
    stripeSubscriptionId: sub.id,
    plan: planIdForPrice(priceId),
    status: sub.status,
    currentPeriodStart: toIso(sub.current_period_start),
    currentPeriodEnd: toIso(sub.current_period_end),
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return new NextResponse('Webhook not configured', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    return new NextResponse(`Invalid signature: ${e instanceof Error ? e.message : ''}`, {
      status: 400,
    });
  }

  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId ?? null;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        await syncFromSubscription(sub, tenantId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncFromSubscription(sub, sub.metadata?.tenantId ?? null);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const admin = createAdminClient();
      const tenantId =
        sub.metadata?.tenantId ?? (await findTenantByStripeCustomer(admin, String(sub.customer)));
      if (tenantId) await downgradeSubscription(admin, tenantId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
