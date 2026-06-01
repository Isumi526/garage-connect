import { runDailyNotifications } from '@/lib/notifications/run';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * 日次通知バッチのトリガーエンドポイント。
 * pg_cron（pg_net 経由）または Vercel Cron から
 *   Authorization: Bearer <CRON_SECRET>
 * を付けて毎日 09:00 JST に呼び出す。
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createAdminClient();
  const summary = await runDailyNotifications(supabase);
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron は GET で叩くため両対応
export async function GET(req: Request) {
  return handle(req);
}
