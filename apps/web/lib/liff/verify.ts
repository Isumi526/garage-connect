import 'server-only';

/**
 * LIFF から渡された LINE アクセストークンを検証し、LINE User ID を得る。
 * LINE の profile エンドポイントを叩くことでトークンの正当性も同時に確認する。
 *
 * ローカル/E2E 検証では LINE に到達できないため、LIFF_ALLOW_DEV_USER=true の場合に限り
 * devUserId をそのまま採用する（本番では必ず false）。
 *
 * ⚠️ 本番の注意: 単一 LIFF アプリ構成では、LIFF ログインチャネルで得られる userId と、
 *    テナント別 Messaging チャネルの webhook で得た userId はチャネルスコープが異なり得る。
 *    同一プロバイダー内で揃える運用前提。詳細は docs/ARCHITECTURE.md 参照。
 */
export async function resolveLineUserId(
  accessToken: string | null | undefined,
  devUserId?: string | null,
): Promise<string | null> {
  if (devUserId && process.env.LIFF_ALLOW_DEV_USER === 'true') {
    return devUserId;
  }
  if (!accessToken) return null;

  const res = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const profile = (await res.json()) as { userId?: string };
  return profile.userId ?? null;
}
