import { requireAuth } from '@/lib/auth/context';
import { friendAddUrl, getLineClientForTenant } from '@/lib/line/client';
import { qrDataUrl } from '@/lib/qr/generate';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PrintButton } from './print-button';

export default async function FriendQrPage() {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  let qr: { dataUrl: string; url: string; name?: string } | null = null;
  try {
    const client = await getLineClientForTenant(supabase, tenant.id);
    const info = await client.botInfo();
    if (info?.basicId) {
      const url = friendAddUrl(info.basicId);
      qr = { dataUrl: await qrDataUrl(url, 520), url, name: info.displayName };
    }
  } catch {
    qr = null;
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      {qr ? (
        <>
          <div>
            <p className="text-sm text-muted-foreground">{tenant.name}</p>
            <h1 className="text-2xl font-bold">LINEで友だち追加</h1>
            {qr.name && <p className="mt-1 text-muted-foreground">{qr.name}</p>}
          </div>
          <img src={qr.dataUrl} alt="友だち追加QR" className="h-[520px] w-[520px] max-w-full" />
          <p className="text-sm text-muted-foreground">スマホのカメラ／LINEで読み取ってください</p>
          <div className="flex gap-3 print:hidden">
            <PrintButton />
            <Link
              href="/dashboard/settings/line"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm"
            >
              戻る
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            友だち追加QRを表示できません。LINE 設定で Channel Access Token を保存してください。
          </p>
          <Link href="/dashboard/settings/line" className="text-primary hover:underline">
            LINE 設定へ
          </Link>
        </div>
      )}
    </div>
  );
}
