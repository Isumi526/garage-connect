import 'server-only';
import { decrypt } from '@/lib/crypto';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

const LINE_API = 'https://api.line.me/v2/bot';

export type LineMessage = { type: 'text'; text: string } | Record<string, unknown>;

/** テナントの暗号化済みトークンを復号して LINE クライアントを返す */
export async function getLineClientForTenant(supabase: SupabaseClient<Database>, tenantId: string) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('line_channel_access_token_encrypted')
    .eq('id', tenantId)
    .single();

  const enc = tenant?.line_channel_access_token_encrypted;
  if (!enc) {
    throw new Error('このテナントの LINE Channel Access Token が未設定です');
  }
  const accessToken = decrypt(enc);
  return createLineClient(accessToken);
}

/** アクセストークン直指定のクライアント（設定画面の疎通テスト用） */
export function createLineClient(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  return {
    /** プッシュ送信。失敗時は例外を投げる。 */
    async push(to: string, messages: LineMessage[]): Promise<void> {
      const res = await fetch(`${LINE_API}/message/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, messages }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`LINE push 失敗 (${res.status}): ${detail}`);
      }
    },
    /** 友だちのプロフィール取得（友だち追加時の表示名・画像） */
    async getProfile(userId: string): Promise<{ displayName?: string; pictureUrl?: string }> {
      const res = await fetch(`${LINE_API}/profile/${userId}`, { headers });
      if (!res.ok) return {};
      return res.json();
    },
    /** トークンの有効性確認（bot 情報取得） */
    async verify(): Promise<{ ok: boolean; botUserId?: string; error?: string }> {
      const res = await fetch(`${LINE_API}/info`, { headers });
      if (!res.ok) {
        return { ok: false, error: `${res.status}: ${await res.text()}` };
      }
      const info = await res.json();
      return { ok: true, botUserId: info.userId };
    },
  };
}

export type LineClient = ReturnType<typeof createLineClient>;
