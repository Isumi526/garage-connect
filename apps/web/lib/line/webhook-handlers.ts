import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Supa = SupabaseClient<Database>;

export interface LineEvent {
  type: string;
  source?: { userId?: string };
  // postback など他フィールドは省略
  [key: string]: unknown;
}

/** 友だち追加：line_connections を upsert（ブロック解除・プロフィール更新） */
export async function handleFollow(
  supabase: Supa,
  tenantId: string,
  userId: string,
  profile: { displayName?: string; pictureUrl?: string },
): Promise<void> {
  await supabase.from('line_connections').upsert(
    {
      tenant_id: tenantId,
      line_user_id: userId,
      display_name: profile.displayName ?? null,
      picture_url: profile.pictureUrl ?? null,
      is_blocked: false,
    },
    { onConflict: 'tenant_id,line_user_id' },
  );
}

/** ブロック（友だち削除）：is_blocked を立てる */
export async function handleUnfollow(
  supabase: Supa,
  tenantId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('line_connections')
    .update({ is_blocked: true })
    .eq('tenant_id', tenantId)
    .eq('line_user_id', userId);
}

/**
 * Webhook イベント配列を捌く。プロフィール取得関数は注入（テスト容易化）。
 */
export async function dispatchEvents(
  supabase: Supa,
  tenantId: string,
  events: LineEvent[],
  getProfile: (userId: string) => Promise<{ displayName?: string; pictureUrl?: string }>,
): Promise<void> {
  for (const evt of events) {
    const userId = evt.source?.userId;
    if (!userId) continue;
    switch (evt.type) {
      case 'follow':
        await handleFollow(supabase, tenantId, userId, await getProfile(userId));
        break;
      case 'unfollow':
        await handleUnfollow(supabase, tenantId, userId);
        break;
      // postback（予約など）は Phase 4 で対応
      default:
        break;
    }
  }
}
