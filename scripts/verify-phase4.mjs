/**
 * Phase 4 検証: LIFF 予約フロー（実 API ルート経由）。
 * - linked / unlinked セッション判定（line_connections 再利用, 概念2）
 * - LIFF から予約作成 → 店舗側(DB)に pending で表示
 * - 未紐付けユーザーの予約は 403
 * - 希望日が JST のまま保存される（UTC ズレなし, 概念4）
 * 前提: Next を BASE で起動済み、supabase ローカル稼働。
 * 実行: BASE=http://localhost:3310 node scripts/verify-phase4.mjs
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE ?? 'http://localhost:3310';

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const svc = (path, init = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

function jstPlus(days) {
  return new Date(Date.now() + days * 86400000).toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Tokyo',
  });
}

async function main() {
  console.log('=== Phase 4 検証 ===\n');

  // テナント作成
  const signup = await fetch(`${SUPA}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@phase4.test',
      password: 'Password123!',
      data: { tenant_name: 'Phase4 整備', slug: 'phase4' },
    }),
  }).then((r) => r.json());
  const userId = signup.user.id;
  const tenantId = (await (await svc(`shop_users?select=tenant_id&id=eq.${userId}`)).json())[0]
    .tenant_id;

  // 顧客 + 車両 + LINE 連携(紐付け済み)
  const customer = (
    await (
      await svc('customers', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ tenant_id: tenantId, name: '山田太郎' }),
      })
    ).json()
  )[0];
  const vehicle = (
    await (
      await svc('vehicles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          tenant_id: tenantId,
          customer_id: customer.id,
          vehicle_name: 'フィット',
          inspection_expiry_date: jstPlus(40),
        }),
      })
    ).json()
  )[0];
  await svc('line_connections', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: tenantId,
      customer_id: customer.id,
      line_user_id: 'U_liff_linked',
      display_name: '山田太郎',
      is_blocked: false,
    }),
  });

  const liff = (path, body) =>
    fetch(`${BASE}/api/liff/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // 1. linked セッション
  const linked = await liff('session', { tenantId, devUserId: 'U_liff_linked' }).then((r) =>
    r.json(),
  );
  check(
    'linked: status=linked & 顧客名取得',
    linked.status === 'linked' && linked.customer?.name === '山田太郎',
  );
  check(
    'linked: 保有車両 1 台が返る',
    linked.vehicles?.length === 1,
    `vehicles=${linked.vehicles?.length}`,
  );

  // 2. 未紐付けユーザー（概念2）
  const unlinked = await liff('session', { tenantId, devUserId: 'U_stranger' }).then((r) =>
    r.json(),
  );
  check(
    'unlinked: 友だち未紐付けは status=unlinked',
    unlinked.status === 'unlinked',
    `status=${unlinked.status}`,
  );

  // 3. LIFF から予約作成（希望日は JST today+10）
  const preferred = jstPlus(10);
  const created = await liff('bookings', {
    tenantId,
    devUserId: 'U_liff_linked',
    vehicle_id: vehicle.id,
    booking_type: 'inspection',
    preferred_date: preferred,
    preferred_time_slot: 'morning',
  });
  const createdJson = await created.json();
  check('予約作成: 200 & bookingId 返却', created.status === 200 && !!createdJson.bookingId);

  // 4. 未紐付けユーザーの予約は 403（概念2）
  const forbidden = await liff('bookings', {
    tenantId,
    devUserId: 'U_stranger',
    vehicle_id: vehicle.id,
    booking_type: 'inspection',
    preferred_date: preferred,
    preferred_time_slot: 'morning',
  });
  check('未紐付けユーザーの予約は 403', forbidden.status === 403, `status=${forbidden.status}`);

  // 5. 店舗側(DB)に pending で表示される
  const bookings = await (
    await svc(`bookings?select=status,preferred_date,preferred_time_slot&tenant_id=eq.${tenantId}`)
  ).json();
  check(
    '店舗側に予約が pending で 1 件表示',
    bookings.length === 1 && bookings[0].status === 'pending',
    `count=${bookings.length}`,
  );

  // 6. JST のまま保存（UTC ズレなし, 概念4）
  check(
    '希望日が JST のまま保存される',
    bookings[0]?.preferred_date === preferred,
    `保存=${bookings[0]?.preferred_date} / 期待=${preferred}`,
  );

  console.log(`\n=== 結果: ${pass} passed / ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
