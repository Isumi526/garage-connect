import { linkConnectionToCustomer } from '@/app/dashboard/settings/line/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { clientEnv } from '@/lib/env';
import { friendAddUrl, getLineClientForTenant } from '@/lib/line/client';
import { qrDataUrl } from '@/lib/qr/generate';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LineConfigForm } from './line-config-form';

export default async function LineSettingsPage() {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select(
      'line_channel_id, liff_id, line_channel_access_token_encrypted, line_channel_secret_encrypted',
    )
    .eq('id', tenant.id)
    .single();

  // 未紐付けの友だち（顧客紐付け待ち）
  const { data: unlinked } = await supabase
    .from('line_connections')
    .select('id, line_user_id, display_name')
    .is('customer_id', null)
    .eq('is_blocked', false);

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, corporate_name, customer_type')
    .order('created_at', { ascending: false });

  const webhookUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/api/line/webhook/${tenant.id}`;

  // 友だち追加QR（アクセストークンがあれば bot 情報から生成）
  let friendQr: { dataUrl: string; url: string; name?: string } | null = null;
  if (tenantRow?.line_channel_access_token_encrypted) {
    try {
      const client = await getLineClientForTenant(supabase, tenant.id);
      const info = await client.botInfo();
      if (info?.basicId) {
        const url = friendAddUrl(info.basicId);
        friendQr = { dataUrl: await qrDataUrl(url, 200), url, name: info.displayName };
      }
    } catch {
      // トークン未設定/失効時は QR を出さない
    }
  }

  return (
    <>
      <PageHeader title="LINE 連携設定" description="自社の LINE 公式アカウントを接続します" />

      <div className="space-y-6">
        {friendQr && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>友だち追加QR</CardTitle>
                <CardDescription>
                  受付でお客様に読み取ってもらうと、公式アカウントが友だち追加されます。
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/settings/line/friend-qr" target="_blank">
                  大きく表示・印刷
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              <img src={friendQr.dataUrl} alt="友だち追加QR" width={200} height={200} />
              <div className="space-y-1 text-sm">
                {friendQr.name && <p className="font-medium">{friendQr.name}</p>}
                <p className="text-muted-foreground">友だち追加URL:</p>
                <a
                  href={friendQr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {friendQr.url}
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>
              LINE Developers の Messaging API 設定でこの URL を登録してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-sm">
              {webhookUrl}
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel 情報</CardTitle>
            <CardDescription>
              トークン・シークレットは暗号化して保存されます（AES-256-GCM）。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineConfigForm
              channelId={tenantRow?.line_channel_id ?? ''}
              liffId={tenantRow?.liff_id ?? ''}
              hasAccessToken={!!tenantRow?.line_channel_access_token_encrypted}
              hasChannelSecret={!!tenantRow?.line_channel_secret_encrypted}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>友だちの顧客紐付け（{unlinked?.length ?? 0}）</CardTitle>
            <CardDescription>
              公式アカウントを友だち追加した LINE ユーザーを、顧客に紐付けます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unlinked && unlinked.length > 0 ? (
              <ul className="divide-y">
                {unlinked.map((conn) => (
                  <li key={conn.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm font-medium">
                      {conn.display_name ?? conn.line_user_id}
                    </span>
                    <form action={linkConnectionToCustomer} className="flex items-center gap-2">
                      <input type="hidden" name="connection_id" value={conn.id} />
                      <select
                        name="customer_id"
                        required
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">顧客を選択</option>
                        {customers?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.customer_type === 'corporate' && c.corporate_name
                              ? c.corporate_name
                              : c.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="secondary">
                        紐付け
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                紐付け待ちの友だちはいません。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
