'use client';

/**
 * LIFF 初期化ラッパー（クライアント専用）。
 *
 * 【概念1: URL パラメータ消失対策】
 *  liff.login() でリダイレクトする際、元 URL の ?t=<tenantId> が失われることがある。
 *  対策として (a) ?t= を localStorage に退避、(b) login 時に redirectUri へ
 *  現在 URL（?t= 込み）を明示し、(c) 復帰時に URL→localStorage の順で復元する。
 *
 * 【ローカル検証】
 *  NEXT_PUBLIC_LIFF_ID 未設定、または ?mock=1 の場合は LIFF SDK を使わず、
 *  ?u=<lineUserId> を devUserId として用いる（サーバ側 LIFF_ALLOW_DEV_USER と対）。
 */

const TENANT_KEY = 'gc_liff_tenant';

export type LiffContext = {
  mode: 'real' | 'mock';
  tenantId: string | null;
  accessToken: string | null;
  devUserId: string | null;
};

function readTenantId(): string | null {
  const url = new URL(window.location.href);
  const t = url.searchParams.get('t');
  if (t) {
    window.localStorage.setItem(TENANT_KEY, t);
    return t;
  }
  // リダイレクトでクエリが落ちた場合に備えて復元
  return window.localStorage.getItem(TENANT_KEY);
}

export async function initLiff(): Promise<LiffContext> {
  const url = new URL(window.location.href);
  const tenantId = readTenantId();
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const isMock = !liffId || url.searchParams.get('mock') === '1';

  if (isMock) {
    return {
      mode: 'mock',
      tenantId,
      accessToken: null,
      devUserId: url.searchParams.get('u'),
    };
  }

  // 実 LIFF（SDK は動的 import：SSR で window 参照を避ける）
  const liff = (await import('@line/liff')).default;
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    // tenantId を退避してから、?t= を含む現在 URL を redirectUri に明示
    if (tenantId) window.localStorage.setItem(TENANT_KEY, tenantId);
    liff.login({ redirectUri: window.location.href });
    // login() はリダイレクトするため以降は実行されない
    return { mode: 'real', tenantId, accessToken: null, devUserId: null };
  }

  return {
    mode: 'real',
    tenantId,
    accessToken: liff.getAccessToken(),
    devUserId: null,
  };
}
