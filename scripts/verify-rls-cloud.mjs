#!/usr/bin/env node
/**
 * 本番クラウドでマルチテナント分離を再検証（増えたテーブルも含む）。
 * 一時テナント A/B を admin API で作成 → 各 JWT で相互アクセスを試行 → 後始末で削除。
 */
import { readFileSync } from 'node:fs';

const D = '/tmp/gc-deploy';
const URL = readFileSync(`${D}/SUPA_URL`, 'utf8').trim();
const ANON = readFileSync(`${D}/ANON`, 'utf8').trim();
const SVC = readFileSync(`${D}/SERVICE`, 'utf8').trim();
const PW = 'Password123!';
const ts = Date.now();

let pass = 0;
let fail = 0;
const check = (l, ok, d = '') => {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${l}${d ? `  — ${d}` : ''}`);
  ok ? pass++ : fail++;
};
const adminH = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };

async function createTenant(slug) {
  const email = `rlscheck-${slug}-${ts}@gmail.com`;
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminH,
    body: JSON.stringify({
      email,
      password: PW,
      email_confirm: true,
      user_metadata: { tenant_name: `RLS ${slug}`, slug: `rlscheck-${slug}-${ts}` },
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`createUser: ${JSON.stringify(j)}`);
  return { id: j.id, email };
}
async function signIn(email) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const j = await r.json();
  return j.access_token;
}
function rest(token) {
  return async (path, init = {}) => {
    const r = await fetch(`${URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const t = await r.text();
    return { status: r.status, body: t ? JSON.parse(t) : null };
  };
}

async function main() {
  console.log('=== 本番クラウド マルチテナント分離 再検証 ===\n');
  const a = await createTenant('a');
  const b = await createTenant('b');
  const [tokA, tokB] = [await signIn(a.email), await signIn(b.email)];
  const A = rest(tokA);
  const B = rest(tokB);
  const tA = (await A('shop_users?select=tenant_id')).body[0].tenant_id;
  const tB = (await B('shop_users?select=tenant_id')).body[0].tenant_id;
  check('一時テナント2件を作成（別 tenant_id）', tA && tB && tA !== tB);

  // 各テナントに顧客を1件
  await A('customers', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: tA, name: 'A社 顧客' }),
  });
  await B('customers', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: tB, name: 'B社 顧客' }),
  });
  // A にスケジュールイベントを1件（schedule_events の分離確認用）
  await A('schedule_events', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: tA,
      event_type: 'other',
      title: 'A社用事',
      start_at: '2026-07-01T01:00:00Z',
      end_at: '2026-07-01T02:00:00Z',
    }),
  });

  // 各テーブルで「B が A のデータを読めない」ことを確認
  for (const table of [
    'customers',
    'business_hours',
    'schedule_events',
    'bookings',
    'line_connections',
    'vehicles',
    'notification_templates',
    'subscriptions',
  ]) {
    const seen = (await B(`${table}?select=*&tenant_id=eq.${tA}`)).body;
    check(
      `B は A の ${table} を読めない`,
      Array.isArray(seen) && seen.length === 0,
      `${seen?.length}件`,
    );
  }

  // A は自分の業務データは見える（正常系）
  const ownCust = (await A('customers?select=name')).body;
  const ownBh = (await A('business_hours?select=weekday')).body;
  check('正常系: A は自社の顧客が見える', ownCust?.length === 1 && ownCust[0].name === 'A社 顧客');
  check('正常系: A は自社の営業時間7件が見える', ownBh?.length === 7);

  // 攻撃: B が A の tenant_id を詐称して顧客を作る → 拒否
  const forge = await B('customers', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: tA, name: '不正' }),
  });
  check(
    '攻撃: B が A の tenant_id で INSERT → 拒否(4xx)',
    forge.status >= 400 && forge.status < 500,
    `status=${forge.status}`,
  );

  // 後始末：テナント削除（子データ cascade）＋ auth ユーザー削除
  await fetch(`${URL}/rest/v1/tenants?id=in.(${tA},${tB})`, { method: 'DELETE', headers: adminH });
  for (const u of [a.id, b.id]) {
    await fetch(`${URL}/auth/v1/admin/users/${u}`, { method: 'DELETE', headers: adminH });
  }
  const leftover = (
    await fetch(`${URL}/rest/v1/tenants?select=id&slug=like.rlscheck-*`, { headers: adminH }).then(
      (r) => r.json(),
    )
  ).length;
  check('後始末: 一時テナントを削除済み', leftover === 0, `残=${leftover}`);

  console.log(`\n=== 結果: ${pass} passed / ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
