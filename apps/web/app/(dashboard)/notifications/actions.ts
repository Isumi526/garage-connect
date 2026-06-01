'use server';

import { requireAuth } from '@/lib/auth/context';
import { runDailyNotifications } from '@/lib/notifications/run';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type RunState = { error?: string; success?: string } | null;

/**
 * 日次通知バッチを手動実行する（動作確認用）。owner/admin のみ。
 * 全テナント走査ではなく、操作者のテナントだけは保証できないため
 * Service Role で実行するが、結果サマリのみ返す。
 */
export async function runNotificationsNow(): Promise<RunState> {
  const { shopUser } = await requireAuth();
  if (!['owner', 'admin'].includes(shopUser.role)) {
    return { error: '実行する権限がありません' };
  }
  const supabase = createAdminClient();
  try {
    const summary = await runDailyNotifications(supabase);
    revalidatePath('/dashboard/notifications');
    return {
      success: `実行完了: 送信 ${summary.sent} / 失敗 ${summary.failed} / スキップ ${summary.skipped}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '実行に失敗しました' };
  }
}
