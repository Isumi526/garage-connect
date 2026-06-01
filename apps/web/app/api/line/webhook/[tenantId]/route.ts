import { decrypt } from '@/lib/crypto';
import { createLineClient } from '@/lib/line/client';
import { validateSignature } from '@/lib/line/signature';
import { type LineEvent, dispatchEvents } from '@/lib/line/webhook-handlers';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * テナント別 LINE Webhook。URL にテナント ID を含めることで、
 * destination の曖昧さを避けて確実にテナントを特定する。
 * LINE Developers の Webhook URL に
 *   https://<app>/api/line/webhook/<tenantId>
 * を登録してもらう。
 */
export async function POST(req: Request, { params }: { params: { tenantId: string } }) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature');

  // Webhook は未認証アクセスのため Service Role でテナント設定を読む
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, line_channel_secret_encrypted, line_channel_access_token_encrypted')
    .eq('id', params.tenantId)
    .single();

  if (!tenant?.line_channel_secret_encrypted) {
    return new NextResponse('Tenant not configured', { status: 404 });
  }

  const channelSecret = decrypt(tenant.line_channel_secret_encrypted);
  if (!validateSignature(body, channelSecret, signature)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body) as { events?: LineEvent[] };
  const events = payload.events ?? [];

  // プロフィール取得用クライアント（アクセストークンがあれば）
  const getProfile = tenant.line_channel_access_token_encrypted
    ? createLineClient(decrypt(tenant.line_channel_access_token_encrypted)).getProfile
    : async () => ({});

  await dispatchEvents(admin, tenant.id, events, getProfile);

  return new NextResponse('OK', { status: 200 });
}
