'use server';

import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ScheduleSettingsState = { error?: string; success?: string } | null;

const TIME_RE = /^\d{2}:\d{2}$/;

/** 営業時間・定休日・予約枠設定を保存（owner/admin のみ） */
export async function saveScheduleSettings(
  _prev: ScheduleSettingsState,
  formData: FormData,
): Promise<ScheduleSettingsState> {
  const { tenant, shopUser } = await requireAuth();
  if (!['owner', 'admin'].includes(shopUser.role)) {
    return { error: '設定を変更する権限がありません' };
  }

  const slotMinutes = Number(formData.get('slot_minutes'));
  const slotCapacity = Number(formData.get('slot_capacity'));
  if (![15, 30, 60].includes(slotMinutes)) {
    return { error: '予約枠の長さが不正です' };
  }
  if (!Number.isInteger(slotCapacity) || slotCapacity < 1 || slotCapacity > 99) {
    return { error: '1枠の定員は 1〜99 で指定してください' };
  }

  const rows: {
    tenant_id: string;
    weekday: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const isClosed = formData.get(`closed_${wd}`) === 'on';
    const open = String(formData.get(`open_${wd}`) ?? '');
    const close = String(formData.get(`close_${wd}`) ?? '');
    if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
      return { error: `${['日', '月', '火', '水', '木', '金', '土'][wd]}曜の時刻が不正です` };
    }
    if (!isClosed && open >= close) {
      return {
        error: `${['日', '月', '火', '水', '木', '金', '土'][wd]}曜の開店時刻は閉店時刻より前にしてください`,
      };
    }
    rows.push({
      tenant_id: tenant.id,
      weekday: wd,
      open_time: open,
      close_time: close,
      is_closed: isClosed,
    });
  }

  const supabase = createClient();
  const { error: tErr } = await supabase
    .from('tenants')
    .update({ slot_minutes: slotMinutes, slot_capacity: slotCapacity })
    .eq('id', tenant.id);
  if (tErr) return { error: `保存に失敗しました: ${tErr.message}` };

  const { error: bErr } = await supabase
    .from('business_hours')
    .upsert(rows, { onConflict: 'tenant_id,weekday' });
  if (bErr) return { error: `保存に失敗しました: ${bErr.message}` };

  revalidatePath('/dashboard/settings/schedule');
  return { success: '営業時間・予約枠設定を保存しました' };
}
