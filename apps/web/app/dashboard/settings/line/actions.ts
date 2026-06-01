'use server';

import { requireAuth } from '@/lib/auth/context';
import { decrypt, encrypt } from '@/lib/crypto';
import { createLineClient } from '@/lib/line/client';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type LineConfigState = { error?: string; success?: string } | null;

/**
 * LINE Channel 設定を保存する。アクセストークン・シークレットは
 * 暗号化して DB に保存する（owner/admin のみ）。空欄の項目は変更しない。
 */
export async function saveLineConfig(
  _prev: LineConfigState,
  formData: FormData,
): Promise<LineConfigState> {
  const { tenant, shopUser } = await requireAuth();
  if (!['owner', 'admin'].includes(shopUser.role)) {
    return { error: '設定を変更する権限がありません' };
  }

  const channelId = String(formData.get('line_channel_id') ?? '').trim();
  const liffId = String(formData.get('liff_id') ?? '').trim();
  const accessToken = String(formData.get('access_token') ?? '').trim();
  const channelSecret = String(formData.get('channel_secret') ?? '').trim();

  const update: Record<string, string | null> = {
    line_channel_id: channelId || null,
    liff_id: liffId || null,
  };
  if (accessToken) update.line_channel_access_token_encrypted = encrypt(accessToken);
  if (channelSecret) update.line_channel_secret_encrypted = encrypt(channelSecret);

  const supabase = createClient();
  const { error } = await supabase.from('tenants').update(update).eq('id', tenant.id);
  if (error) return { error: `保存に失敗しました: ${error.message}` };

  revalidatePath('/dashboard/settings/line');
  return { success: 'LINE 設定を保存しました' };
}

/** 保存済みアクセストークンで LINE API へ疎通確認する */
export async function verifyLineToken(): Promise<LineConfigState> {
  const { tenant } = await requireAuth();
  const supabase = createClient();
  const { data } = await supabase
    .from('tenants')
    .select('line_channel_access_token_encrypted')
    .eq('id', tenant.id)
    .single();
  if (!data?.line_channel_access_token_encrypted) {
    return { error: 'アクセストークンが未設定です' };
  }
  const client = createLineClient(decrypt(data.line_channel_access_token_encrypted));
  const result = await client.verify();
  return result.ok
    ? { success: `疎通 OK（bot userId: ${result.botUserId}）` }
    : { error: `疎通に失敗しました: ${result.error}` };
}

/** 友だち（line_connection）を顧客に紐付ける */
export async function linkConnectionToCustomer(formData: FormData): Promise<void> {
  await requireAuth();
  const connectionId = String(formData.get('connection_id') ?? '');
  const customerId = String(formData.get('customer_id') ?? '');
  if (!connectionId || !customerId) return;

  const supabase = createClient();
  await supabase
    .from('line_connections')
    .update({ customer_id: customerId })
    .eq('id', connectionId);
  revalidatePath('/dashboard/settings/line');
}
