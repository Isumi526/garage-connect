/**
 * テストテナントの業務データを本番(クラウド)へ移植する一回限りのスクリプト。
 * - LINE Token/Secret は「ローカル鍵で復号 → 本番鍵で再暗号化」して移送
 * - 顧客・車両・LINE連携を本番テナントへ複製
 * 実行: pnpm --filter web exec tsx ../../scripts/migrate-to-prod.ts
 */
import { readFileSync } from 'node:fs';
import { decrypt, encrypt } from '../apps/web/lib/crypto/index';

const D = '/tmp/gc-deploy';
const PROD_TENANT = 'f2ae6b69-cf49-4b88-bf57-0169603b8ac8';

const localEnv = Object.fromEntries(
  readFileSync(`${__dirname}/../apps/web/.env.local`, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string];
    }),
);
const LOCAL_KEY = localEnv.ENCRYPTION_KEY;
const PROD_KEY = readFileSync(`${D}/ENC`, 'utf8').trim();
const SUPA = readFileSync(`${D}/SUPA_URL`, 'utf8').trim();
const SVC = readFileSync(`${D}/SERVICE`, 'utf8').trim();
const data = JSON.parse(readFileSync(`${D}/local-data.json`, 'utf8'));

function reEncrypt(enc: string | null): string | null {
  if (!enc) return null;
  process.env.ENCRYPTION_KEY = LOCAL_KEY;
  const plain = decrypt(enc);
  process.env.ENCRYPTION_KEY = PROD_KEY;
  return encrypt(plain);
}

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function main() {
  console.log('=== テストデータを本番へ移植 ===');

  // 1) LINE 設定を本番鍵で再暗号化して反映
  const t = data.tenant;
  const upd = await rest(`tenants?id=eq.${PROD_TENANT}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      line_channel_id: t.line_channel_id,
      liff_id: t.liff_id,
      brand_color: t.brand_color,
      line_channel_access_token_encrypted: reEncrypt(t.token_enc),
      line_channel_secret_encrypted: reEncrypt(t.secret_enc),
    }),
  });
  console.log(`LINE設定 反映: status=${upd.status} (再暗号化: token/secret)`);

  // 2) 顧客
  const cust = await rest('customers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...data.customer, tenant_id: PROD_TENANT }),
  });
  const customerId = cust.body?.[0]?.id;
  console.log(
    `顧客 移植: status=${cust.status} name=${cust.body?.[0]?.name} id=${customerId?.slice(0, 8)}`,
  );

  // 3) 車両
  const veh = await rest('vehicles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...data.vehicle, tenant_id: PROD_TENANT, customer_id: customerId }),
  });
  console.log(
    `車両 移植: status=${veh.status} name=${veh.body?.[0]?.vehicle_name} 車検=${veh.body?.[0]?.inspection_expiry_date}`,
  );

  // 4) LINE 連携（顧客に紐付け）
  const conn = await rest('line_connections', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...data.conn, tenant_id: PROD_TENANT, customer_id: customerId }),
  });
  console.log(
    `LINE連携 移植: status=${conn.status} user=${conn.body?.[0]?.line_user_id?.slice(0, 10)}… linked=${!!conn.body?.[0]?.customer_id}`,
  );

  console.log('\n=== 完了 ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
