/**
 * Phase 5 検証: プラン制限と購読同期ロジック。
 * 実 lib/billing の関数（server-only）を react-server 条件下で読み込み、
 * Service Role クライアントでシードして検証する。
 * 実行: NODE_OPTIONS='--conditions=react-server' \
 *        pnpm --filter web exec tsx ../../scripts/verify-phase5.ts
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { customerCapacity } from '../apps/web/lib/billing/limit-check';
import {
  downgradeSubscription,
  findTenantByStripeCustomer,
  planIdForPrice,
  upsertSubscriptionFromStripe,
} from '../apps/web/lib/billing/subscription';

const env = Object.fromEntries(
  readFileSync(`${__dirname}/../apps/web/.env.local`, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string];
    }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY as string;

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  console.log('=== Phase 5 検証 ===\n');

  const signup = await fetch(`${URL_}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@phase5.test',
      password: 'Password123!',
      data: { tenant_name: 'Phase5 整備', slug: 'phase5' },
    }),
  }).then((r) => r.json());
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: su } = await admin
    .from('shop_users')
    .select('tenant_id')
    .eq('id', signup.user.id)
    .single();
  const tenantId = (su as { tenant_id: string }).tenant_id;
  // biome-ignore lint/suspicious/noExplicitAny: 検証用に server クライアント型を緩める
  const supa = admin as any;

  // フリートライアル既定。19 件まで投入 → 追加 1 許可
  const rows = Array.from({ length: 19 }, (_, i) => ({
    tenant_id: tenantId,
    name: `顧客${i + 1}`,
  }));
  await admin.from('customers').insert(rows);
  let cap = await customerCapacity(supa, tenantId, 1);
  check(
    'free_trial: 19件時点で +1 は許可',
    cap.allowed && cap.remaining === 1,
    `count=${cap.count} remaining=${cap.remaining}`,
  );

  // 20 件目を投入 → 追加不可
  await admin.from('customers').insert({ tenant_id: tenantId, name: '顧客20' });
  cap = await customerCapacity(supa, tenantId, 1);
  check(
    'free_trial: 20件で上限到達（+1 不可）',
    !cap.allowed && cap.limit === 20,
    `count=${cap.count}`,
  );

  // CSV 一括 5 件は超過で不可
  cap = await customerCapacity(supa, tenantId, 5);
  check('free_trial: 上限到達後の一括追加も不可', !cap.allowed);

  // 購読を standard に同期 → 無制限
  await upsertSubscriptionFromStripe(supa, {
    tenantId,
    stripeCustomerId: 'cus_test_123',
    stripeSubscriptionId: 'sub_test_123',
    plan: 'standard',
    status: 'active',
    currentPeriodStart: '2026-06-01T00:00:00Z',
    currentPeriodEnd: '2026-07-01T00:00:00Z',
  });
  cap = await customerCapacity(supa, tenantId, 100);
  check('standard 同期後は無制限（大量追加も許可）', cap.allowed && cap.limit === null);

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, status, stripe_customer_id')
    .eq('tenant_id', tenantId)
    .single();
  check(
    '購読が standard/active で保存される',
    sub?.plan === 'standard' &&
      sub?.status === 'active' &&
      sub?.stripe_customer_id === 'cus_test_123',
  );

  // Stripe customer から tenant 逆引き
  const found = await findTenantByStripeCustomer(supa, 'cus_test_123');
  check('stripe_customer_id から tenant 逆引き', found === tenantId);

  // price → plan マッピング
  check('price→plan: 既定は standard', planIdForPrice('price_unknown') === 'standard');

  // 解約 → free_trial へダウングレード
  await downgradeSubscription(supa, tenantId);
  const { data: sub2 } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('tenant_id', tenantId)
    .single();
  check(
    '解約で free_trial/canceled に戻る',
    sub2?.plan === 'free_trial' && sub2?.status === 'canceled',
  );
  cap = await customerCapacity(supa, tenantId, 1);
  check('ダウングレード後は再び上限が効く', !cap.allowed);

  console.log(`\n=== 結果: ${pass} passed / ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
