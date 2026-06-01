/**
 * Phase 3 検証: 日次通知バッチ・配信ログ・冪等性・Webhook(友だち追加/紐付け)。
 * 実 run.ts / webhook-handlers.ts を Service Role クライアントで実行し、
 * LINE 送信のみモックして「通知が組み立てられ送られ、ログが残る」ことを確認する。
 * 実行: pnpm --filter web exec tsx ../../scripts/verify-phase3.ts
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { dispatchEvents } from '../apps/web/lib/line/webhook-handlers';
import { runDailyNotifications } from '../apps/web/lib/notifications/run';

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

/** today + days を YYYY-MM-DD（JST 基準・日付のみ）で返す */
function isoPlus(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86400000);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // sv-SE = YYYY-MM-DD
}

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  console.log('=== Phase 3 検証 ===\n');

  const signup = await fetch(`${URL_}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@phase3.test',
      password: 'Password123!',
      data: { tenant_name: 'Phase3 整備', slug: 'phase3' },
    }),
  }).then((r) => r.json());
  const userId = signup.user.id as string;

  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: su } = await admin.from('shop_users').select('tenant_id').eq('id', userId).single();
  const tenantId = (su as { tenant_id: string }).tenant_id;

  const today = new Date('2026-06-01T09:00:00+09:00');
  const expiry = isoPlus(today, 30); // 車検満了 30 日前 → 通知対象

  const { data: customer } = await admin
    .from('customers')
    .insert({ tenant_id: tenantId, name: '山田太郎' })
    .select('id')
    .single();
  const customerId = (customer as { id: string }).id;
  await admin.from('vehicles').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    vehicle_name: 'フィット',
    inspection_expiry_date: expiry,
  });
  await admin.from('line_connections').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    line_user_id: 'U_dummy_line_user',
    display_name: '山田太郎',
    is_blocked: false,
  });

  const pushed: { to: string; text: string }[] = [];
  const mockFactory = async () => ({
    push: async (to: string, messages: { type: 'text'; text: string }[]) => {
      pushed.push({ to, text: messages[0]?.text ?? '' });
    },
    getProfile: async () => ({}),
    verify: async () => ({ ok: true as const }),
  });

  type RunSupa = Parameters<typeof runDailyNotifications>[0];
  type RunFactory = NonNullable<Parameters<typeof runDailyNotifications>[1]>['lineClientFactory'];
  const run = (t: Date) =>
    runDailyNotifications(admin as unknown as RunSupa, {
      today: t,
      lineClientFactory: mockFactory as unknown as RunFactory,
    });

  const summary = await run(today);
  check('バッチ: 1 件送信された', summary.sent === 1, JSON.stringify(summary));
  check('送信先が連携済み LINE ユーザー', pushed[0]?.to === 'U_dummy_line_user');
  check(
    '本文に変数が置換されている（顧客名・車名・満了日）',
    !!pushed[0] &&
      pushed[0].text.includes('山田太郎') &&
      pushed[0].text.includes('フィット') &&
      pushed[0].text.includes('2026年7月1日'),
    pushed[0]?.text.replace(/\n/g, ' '),
  );

  const { data: logs } = await admin
    .from('notification_logs')
    .select('status')
    .eq('tenant_id', tenantId);
  check(
    '配信ログが sent で記録される',
    (logs as { status: string }[] | null)?.some((l) => l.status === 'sent') ?? false,
  );

  const summary2 = await run(today);
  check(
    '冪等性: 同日 2 回目は送信 0・スキップ',
    summary2.sent === 0 && summary2.skipped >= 1,
    JSON.stringify(summary2),
  );

  // 未連携顧客 → skipped
  const { data: c2 } = await admin
    .from('customers')
    .insert({ tenant_id: tenantId, name: '鈴木花子' })
    .select('id')
    .single();
  await admin.from('vehicles').insert({
    tenant_id: tenantId,
    customer_id: (c2 as { id: string }).id,
    vehicle_name: 'ヴィッツ',
    inspection_expiry_date: isoPlus(today, 45),
  });
  await run(today);
  const { count: skipped } = await admin
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'skipped');
  check('LINE 未連携顧客は skipped ログが残る', (skipped ?? 0) >= 1, `skipped=${skipped}`);

  // Webhook follow / unfollow
  const a = admin as unknown as Parameters<typeof dispatchEvents>[0];
  await dispatchEvents(
    a,
    tenantId,
    [{ type: 'follow', source: { userId: 'U_new_friend' } }],
    async () => ({
      displayName: '新規ともだち',
    }),
  );
  const { data: conn } = await admin
    .from('line_connections')
    .select('display_name')
    .eq('tenant_id', tenantId)
    .eq('line_user_id', 'U_new_friend')
    .single();
  check(
    'Webhook follow: line_connection 作成',
    (conn as { display_name: string } | null)?.display_name === '新規ともだち',
  );

  await dispatchEvents(
    a,
    tenantId,
    [{ type: 'unfollow', source: { userId: 'U_new_friend' } }],
    async () => ({}),
  );
  const { data: conn2 } = await admin
    .from('line_connections')
    .select('is_blocked')
    .eq('tenant_id', tenantId)
    .eq('line_user_id', 'U_new_friend')
    .single();
  check(
    'Webhook unfollow: is_blocked=true',
    (conn2 as { is_blocked: boolean } | null)?.is_blocked === true,
  );

  console.log(`\n=== 結果: ${pass} passed / ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
