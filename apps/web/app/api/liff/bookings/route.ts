import { resolveLiffSession } from '@/lib/liff/session';
import { getLineClientForTenant } from '@/lib/line/client';
import { bookingReceivedText, textMessage } from '@/lib/line/messages';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatJstDate, timeSlotLabel } from '@/lib/utils/timezone';
import { BOOKING_TYPE_LABEL, bookingInputSchema } from '@/lib/validations/booking';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * LIFF からの予約作成。
 * - LINE ユーザー紐付けを検証（未紐付けは 403）
 * - 車両が当該顧客・テナントのものか検証
 * - bookings に status=pending で登録（店舗側は「未確認予約」バッジで把握）
 * - 顧客へ受付メッセージを LINE 送信（ベストエフォート）
 */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const { tenantId, accessToken, devUserId, ...bookingRaw } = payload;
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const session = await resolveLiffSession(admin, tenantId, accessToken, devUserId);
  if (session.status !== 'linked') {
    return NextResponse.json({ error: 'not_linked', status: session.status }, { status: 403 });
  }

  const parsed = bookingInputSchema.safeParse(bookingRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'invalid input' },
      { status: 400 },
    );
  }

  // 車両が本人（紐付け顧客）のものか検証
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('id')
    .eq('id', parsed.data.vehicle_id)
    .eq('tenant_id', tenantId)
    .eq('customer_id', session.customer.id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json({ error: 'vehicle not found for this customer' }, { status: 400 });
  }

  const { data: booking, error } = await admin
    .from('bookings')
    .insert({
      tenant_id: tenantId,
      customer_id: session.customer.id,
      vehicle_id: parsed.data.vehicle_id,
      booking_type: parsed.data.booking_type,
      preferred_date: parsed.data.preferred_date,
      preferred_time_slot: parsed.data.preferred_time_slot,
      notes: parsed.data.notes ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? 'failed' }, { status: 500 });
  }

  // 受付メッセージ（送信失敗は予約成立を妨げない）
  try {
    const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single();
    const client = await getLineClientForTenant(admin, tenantId);
    await client.push(session.lineUserId, [
      textMessage(
        bookingReceivedText({
          shopName: tenant?.name ?? '当店',
          bookingTypeLabel: BOOKING_TYPE_LABEL[parsed.data.booking_type] ?? '',
          dateLabel: formatJstDate(parsed.data.preferred_date),
          slotLabel: timeSlotLabel(parsed.data.preferred_time_slot),
        }),
      ),
    ]);
  } catch {
    // トークン未設定/送信失敗時もログには残さず継続（予約自体は成立）
  }

  return NextResponse.json({ ok: true, bookingId: booking.id });
}
