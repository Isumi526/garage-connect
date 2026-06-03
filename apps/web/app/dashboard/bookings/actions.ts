'use server';

import { requireAuth } from '@/lib/auth/context';
import { getLineClientForTenant } from '@/lib/line/client';
import { bookingConfirmedText, textMessage } from '@/lib/line/messages';
import { createClient } from '@/lib/supabase/server';
import { formatJstDate, timeSlotLabel } from '@/lib/utils/timezone';
import { BOOKING_TYPE_LABEL } from '@/lib/validations/booking';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/** 予約を確定し、顧客へ確定通知を送る（送信失敗は確定を妨げない） */
export async function confirmBooking(id: string): Promise<void> {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .select('customer_id, booking_type, preferred_date, preferred_time_slot')
    .single();

  if (booking) {
    const { data: conn } = await supabase
      .from('line_connections')
      .select('line_user_id, is_blocked')
      .eq('customer_id', booking.customer_id)
      .maybeSingle();

    if (conn?.line_user_id && !conn.is_blocked) {
      try {
        const client = await getLineClientForTenant(supabase, tenant.id);
        await client.push(conn.line_user_id, [
          textMessage(
            bookingConfirmedText({
              shopName: tenant.name,
              bookingTypeLabel: BOOKING_TYPE_LABEL[booking.booking_type] ?? '',
              dateLabel: formatJstDate(booking.preferred_date),
              slotLabel: timeSlotLabel(booking.preferred_time_slot),
            }),
          ),
        ]);
        await supabase.from('notification_logs').insert({
          tenant_id: tenant.id,
          customer_id: booking.customer_id,
          trigger_type: 'booking_confirmed',
          channel: 'line',
          recipient: conn.line_user_id,
          status: 'sent',
        });
      } catch (e) {
        await supabase.from('notification_logs').insert({
          tenant_id: tenant.id,
          customer_id: booking.customer_id,
          trigger_type: 'booking_confirmed',
          channel: 'line',
          status: 'failed',
          error_message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  revalidatePath('/dashboard/bookings');
}

/** 予約を「不可」にする */
export async function rejectBooking(id: string): Promise<void> {
  await requireAuth();
  const supabase = createClient();
  await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/calendar');
}

export type BookingEditState = { error: string } | null;

const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled'];

/** 予約を編集する（日時・内容・状態・メモ） */
export async function updateBooking(
  id: string,
  _prev: BookingEditState,
  formData: FormData,
): Promise<BookingEditState> {
  await requireAuth();

  const date = String(formData.get('preferred_date') ?? '');
  const time = String(formData.get('preferred_time_slot') ?? '');
  const bookingType = String(formData.get('booking_type') ?? '');
  const status = String(formData.get('status') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: '希望日が不正です' };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: '時刻は HH:MM で入力してください' };
  if (!['inspection', 'maintenance', 'other'].includes(bookingType)) {
    return { error: '内容が不正です' };
  }
  if (!BOOKING_STATUSES.includes(status)) return { error: '状態が不正です' };

  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({
      preferred_date: date,
      preferred_time_slot: time,
      booking_type: bookingType,
      status,
      notes: notes || null,
    })
    .eq('id', id);
  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/calendar');
  redirect('/dashboard/bookings');
}

/** 予約を削除する */
export async function deleteBooking(id: string): Promise<void> {
  await requireAuth();
  const supabase = createClient();
  await supabase.from('bookings').delete().eq('id', id);
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/calendar');
}
