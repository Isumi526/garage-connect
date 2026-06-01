import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth のメールリンク（パスワード再設定・確認）からのコールバック。
 * PKCE の code をセッションに交換し、next で指定された画面へ遷移する。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  // 失敗時はエラー表示付きでログインへ
  return NextResponse.redirect(new URL('/login?error=auth_callback', url.origin));
}
