import { type BizHour, computeAvailability } from '@/lib/scheduling/availability';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 28;

/** LIFF 向け：今日から WINDOW_DAYS 日分の予約可能枠を返す。 */
export async function POST(req: Request) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('slot_minutes, slot_capacity')
    .eq('id', tenantId)
    .single();
  if (!tenant) {
    return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const until = new Date(Date.now() + WINDOW_DAYS * 86400000).toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Tokyo',
  });

  const [{ data: hours }, { data: closures }, { data: bookings }] = await Promise.all([
    admin
      .from('business_hours')
      .select('weekday, open_time, close_time, is_closed')
      .eq('tenant_id', tenantId),
    admin
      .from('schedule_events')
      .select('start_at, end_at')
      .eq('tenant_id', tenantId)
      .eq('event_type', 'closure')
      .lte('start_at', `${until}T23:59:59+09:00`)
      .gte('end_at', `${today}T00:00:00+09:00`),
    admin
      .from('bookings')
      .select('preferred_date, preferred_time_slot')
      .eq('tenant_id', tenantId)
      .gte('preferred_date', today)
      .in('status', ['pending', 'confirmed']),
  ]);

  const days = computeAvailability({
    hours: (hours ?? []) as BizHour[],
    closures: closures ?? [],
    bookings: bookings ?? [],
    slotMinutes: tenant.slot_minutes ?? 30,
    slotCapacity: tenant.slot_capacity ?? 1,
    fromDate: today,
    days: WINDOW_DAYS,
    nowMs: Date.now(),
  });

  return NextResponse.json({ days });
}
