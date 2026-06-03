'use server';

import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formToObject } from '@/lib/validations/helpers';
import { scheduleEventInputSchema, toEventTimestamps } from '@/lib/validations/schedule';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type EventFormState = { error: string } | null;

function parse(formData: FormData) {
  const raw = formToObject(formData);
  return scheduleEventInputSchema.safeParse({ ...raw, all_day: formData.get('all_day') === 'on' });
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { tenant } = await requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }
  const { start_at, end_at } = toEventTimestamps(parsed.data);

  const supabase = createClient();
  const { error } = await supabase.from('schedule_events').insert({
    tenant_id: tenant.id,
    event_type: parsed.data.event_type,
    title: parsed.data.title ?? null,
    notes: parsed.data.notes ?? null,
    all_day: parsed.data.all_day,
    start_at,
    end_at,
  });
  if (error) return { error: `登録に失敗しました: ${error.message}` };

  revalidatePath('/dashboard/calendar');
  const month = parsed.data.start_date.slice(0, 7);
  redirect(`/dashboard/calendar?m=${month}`);
}

export async function updateEvent(
  id: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAuth();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }
  const { start_at, end_at } = toEventTimestamps(parsed.data);

  const supabase = createClient();
  const { error } = await supabase
    .from('schedule_events')
    .update({
      event_type: parsed.data.event_type,
      title: parsed.data.title ?? null,
      notes: parsed.data.notes ?? null,
      all_day: parsed.data.all_day,
      start_at,
      end_at,
    })
    .eq('id', id);
  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath('/dashboard/calendar');
  redirect(`/dashboard/calendar?m=${parsed.data.start_date.slice(0, 7)}`);
}

export async function deleteEvent(id: string): Promise<void> {
  await requireAuth();
  const supabase = createClient();
  await supabase.from('schedule_events').delete().eq('id', id);
  revalidatePath('/dashboard/calendar');
}
