import 'server-only';
import { requireEnv } from '@/lib/env';
import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Stripe クライアント（遅延初期化）。STRIPE_SECRET_KEY 必須。 */
export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      typescript: true,
    });
  }
  return cached;
}

/** Stripe が設定されているか（未設定なら課金 UI を無効化） */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
