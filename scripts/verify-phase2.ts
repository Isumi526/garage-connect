/**
 * Phase 2 検証: 車検証QR一発登録 と 車検満了日順ソート。
 * 実パーサ(buildDummyInspectionQRCodes/parseConnectedQRCodes)を読み込み、
 * 実 JWT で PostgREST に投入して検証する。
 * 実行: pnpm tsx scripts/verify-phase2.ts
 */
import {
  buildDummyInspectionQRCodes,
  parseConnectedQRCodes,
} from '../apps/web/lib/qr/inspection-certificate-parser';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  ok ? pass++ : fail++;
}

async function signUp(email: string) {
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      data: { tenant_name: 'Phase2 整備', slug: 'phase2' },
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`signup: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

function rest(token: string) {
  return async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

async function main() {
  console.log('=== Phase 2 検証 ===\n');
  const token = await signUp('owner@phase2.test');
  const api = rest(token);
  const tenantId = (await api('shop_users?select=tenant_id')).body[0].tenant_id;

  // ---- 1. 車検証QR一発登録 ----
  const codes = buildDummyInspectionQRCodes({
    region: '品川',
    classNo: '500',
    kana: 'あ',
    serialNo: '1234',
    vin: 'ABC1234567',
    modelCode: 'DBA-GK3',
    firstRegYYYYMM: '202004',
    ownerName: '山田太郎',
    ownerAddress: 'テスト市テスト町1-1-1',
    inspectionExpiryYYYYMMDD: '20260401',
    registrationYYYYMMDD: '20230315',
  });
  const parsed = parseConnectedQRCodes(codes);
  check('QR解析: 使用者名=山田太郎', parsed.ownerName === '山田太郎');
  check('QR解析: 車検満了日=2026-04-01', parsed.inspectionExpiryDate === '2026-04-01');

  // registerFromQr 相当: 顧客を作成 → その customer_id で車両を作成
  const cust = await api('customers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id: tenantId,
      customer_type: 'individual',
      name: parsed.ownerName,
      address: parsed.ownerAddress,
    }),
  });
  const customerId = cust.body?.[0]?.id;
  const veh = await api('vehicles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id: tenantId,
      customer_id: customerId,
      vehicle_number: parsed.vehicleNumber,
      vin: parsed.vin,
      model_code: parsed.modelCode,
      inspection_expiry_date: parsed.inspectionExpiryDate,
      first_registration_date: parsed.firstRegistrationDate,
      registration_date: parsed.registrationDate,
    }),
  });
  check('一発登録: 顧客が作成された', cust.status === 201 && !!customerId);
  check(
    '一発登録: 車両が作成され顧客に紐づく',
    veh.status === 201 && veh.body?.[0]?.customer_id === customerId,
    `vin=${veh.body?.[0]?.vin}`,
  );

  // ---- 2. 車検満了日順ソート ----
  const expiries = ['2026-06-01', '2024-03-01', '2025-01-01'];
  for (const d of expiries) {
    await api('vehicles', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        customer_id: customerId,
        vehicle_name: `車両-${d}`,
        inspection_expiry_date: d,
      }),
    });
  }
  // 満了日なしも 1 台（末尾に来るべき）
  await api('vehicles', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: tenantId,
      customer_id: customerId,
      vehicle_name: '満了日なし',
    }),
  });

  const sorted = await api(
    'vehicles?select=vehicle_name,inspection_expiry_date&order=inspection_expiry_date.asc.nullslast',
  );
  const dates = sorted.body
    .map((v: { inspection_expiry_date: string | null }) => v.inspection_expiry_date)
    .filter((d: string | null): d is string => d !== null);
  const isAscending = dates.every((d: string, i: number) => i === 0 || d >= dates[i - 1]);
  const lastIsNull = sorted.body[sorted.body.length - 1]?.inspection_expiry_date === null;
  check('満了日順: 昇順に並ぶ', isAscending, dates.join(' ≤ '));
  check('満了日順: 未登録(null)は末尾', lastIsNull);

  console.log(`\n=== 結果: ${pass} passed / ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
