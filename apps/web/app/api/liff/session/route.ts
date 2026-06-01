import { resolveLiffSession } from '@/lib/liff/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * LIFF マイページの初期データを返す。
 * 入力: { tenantId, accessToken, devUserId? }
 * 出力: 紐付け状態 + (紐付け済みなら) 顧客・保有車両・最近の予約
 */
export async function POST(req: Request) {
  const { tenantId, accessToken, devUserId } = await req.json().catch(() => ({}));
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // テナント存在チェック（ブランド表示用に名前も返す）
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, brand_color')
    .eq('id', tenantId)
    .single();
  if (!tenant) {
    return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
  }

  const session = await resolveLiffSession(admin, tenantId, accessToken, devUserId);

  if (session.status !== 'linked') {
    return NextResponse.json({
      status: session.status,
      tenant: { name: tenant.name, brandColor: tenant.brand_color },
    });
  }

  const [{ data: vehicles }, { data: bookings }] = await Promise.all([
    admin
      .from('vehicles')
      .select('id, vehicle_name, vehicle_number, inspection_expiry_date')
      .eq('tenant_id', tenantId)
      .eq('customer_id', session.customer.id)
      .eq('status', 'active')
      .order('inspection_expiry_date', { ascending: true, nullsFirst: false }),
    admin
      .from('bookings')
      .select('id, booking_type, preferred_date, preferred_time_slot, status, vehicle_id')
      .eq('tenant_id', tenantId)
      .eq('customer_id', session.customer.id)
      .order('preferred_date', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    status: 'linked',
    tenant: { name: tenant.name, brandColor: tenant.brand_color },
    customer: session.customer,
    vehicles: vehicles ?? [],
    bookings: bookings ?? [],
  });
}
