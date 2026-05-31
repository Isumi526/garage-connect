#!/usr/bin/env node
/**
 * RLS テナント分離の実証スクリプト。
 * 2 テナントを実際にサインアップ → 各テナントの JWT で PostgREST を叩き、
 * 相手テナントのデータが「読めない・書けない」ことを確認する。
 *
 * 実行: node scripts/verify-rls.mjs   (supabase ローカルが起動している必要あり)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

let passed = 0;
let failed = 0;
function check(label, ok, detail = '') {
  const mark = ok ? '✅ PASS' : '❌ FAIL';
  if (ok) passed++;
  else failed++;
  console.log(`${mark}  ${label}${detail ? `  — ${detail}` : ''}`);
}

async function signUp(email, tenantName, slug) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      data: { tenant_name: tenantName, slug, display_name: `${tenantName} オーナー` },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`signup failed (${res.status}): ${JSON.stringify(json)}`);
  return { token: json.access_token, userId: json.user?.id };
}

function authHeaders(token) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function rest(path, token, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  console.log('=== RLS テナント分離 検証 ===\n');

  // 1. 2 テナントを実際にサインアップ（handle_new_user がテナント自動作成）
  const a = await signUp('owner@tenant-a.test', 'テナントA整備', 'tenant-a');
  const b = await signUp('owner@tenant-b.test', 'テナントB自動車', 'tenant-b');
  check('2 テナントのサインアップ成功', !!a.token && !!b.token);

  // 2. 各オーナーが自テナント情報を取得（tenant_id を得る）
  const aTenant = await rest('shop_users?select=tenant_id,role,email', a.token);
  const bTenant = await rest('shop_users?select=tenant_id,role,email', b.token);
  const aTenantId = aTenant.body?.[0]?.tenant_id;
  const bTenantId = bTenant.body?.[0]?.tenant_id;
  check(
    '各オーナーが自テナントの shop_users を 1 件だけ参照',
    aTenant.body?.length === 1 && bTenant.body?.length === 1,
    `A=${aTenant.body?.length}件 / B=${bTenant.body?.length}件`,
  );
  check(
    'テナント A と B は別 tenant_id',
    aTenantId && bTenantId && aTenantId !== bTenantId,
    `A=${aTenantId?.slice(0, 8)} / B=${bTenantId?.slice(0, 8)}`,
  );
  check('オーナー権限が付与されている', aTenant.body?.[0]?.role === 'owner');

  // 3. 各テナントに顧客を 1 件ずつ登録
  const insA = await rest('customers', a.token, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ tenant_id: aTenantId, name: '山田太郎', phone: '090-0000-0000' }),
  });
  const insB = await rest('customers', b.token, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ tenant_id: bTenantId, name: '鈴木花子', phone: '090-0000-0001' }),
  });
  check('テナント A が自テナントへ顧客登録できる', insA.status === 201, `status=${insA.status}`);
  check('テナント B が自テナントへ顧客登録できる', insB.status === 201, `status=${insB.status}`);
  const aCustomerId = insA.body?.[0]?.id;
  const bCustomerId = insB.body?.[0]?.id;

  // 4. 各テナントは自分の顧客「のみ」見える
  const aList = await rest('customers?select=id,name,tenant_id', a.token);
  const bList = await rest('customers?select=id,name,tenant_id', b.token);
  check(
    'テナント A の顧客一覧は 1 件（自分のみ）',
    aList.body?.length === 1,
    `見えた件数=${aList.body?.length}, name=${aList.body?.[0]?.name}`,
  );
  check(
    'テナント B の顧客一覧は 1 件（自分のみ）',
    bList.body?.length === 1,
    `見えた件数=${bList.body?.length}, name=${bList.body?.[0]?.name}`,
  );
  check(
    'テナント A に B の顧客(鈴木花子)が混ざっていない',
    !aList.body?.some((c) => c.name === '鈴木花子'),
  );

  // 5. 攻撃1: A が B の顧客を id 直接指定で読もうとする → 0 件
  const steal = await rest(`customers?id=eq.${bCustomerId}&select=*`, a.token);
  check(
    '攻撃: A が B の顧客 id を直接指定 → 0 件（漏えいなし）',
    Array.isArray(steal.body) && steal.body.length === 0,
    `返却件数=${steal.body?.length}`,
  );

  // 6. 攻撃2: A が B の tenant_id を詐称して顧客を INSERT → RLS で拒否
  const forge = await rest('customers', a.token, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ tenant_id: bTenantId, name: '不正データ' }),
  });
  check(
    '攻撃: A が B の tenant_id を詐称して INSERT → 拒否(4xx)',
    forge.status >= 400 && forge.status < 500,
    `status=${forge.status}`,
  );

  // 7. 攻撃3: A が B の顧客を UPDATE しようとする → 0 件更新
  const tamper = await rest(`customers?id=eq.${bCustomerId}`, a.token, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: '改ざん' }),
  });
  check(
    '攻撃: A が B の顧客を UPDATE → 0 件（改ざん不可）',
    Array.isArray(tamper.body) && tamper.body.length === 0,
    `更新件数=${tamper.body?.length}`,
  );

  // 8. 攻撃4: A が B のテナント情報を読もうとする → 0 件
  const tenantPeek = await rest(`tenants?id=eq.${bTenantId}&select=*`, a.token);
  check(
    '攻撃: A が B のテナント行を読む → 0 件',
    Array.isArray(tenantPeek.body) && tenantPeek.body.length === 0,
    `返却件数=${tenantPeek.body?.length}`,
  );

  // 9. 自テナント情報は読める（正常系の確認）
  const ownTenant = await rest('tenants?select=name,slug', a.token);
  check(
    '正常系: A は自テナント情報を読める',
    ownTenant.body?.length === 1,
    `name=${ownTenant.body?.[0]?.name}`,
  );

  console.log(`\n=== 結果: ${passed} passed / ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('検証スクリプトでエラー:', e);
  process.exit(1);
});
