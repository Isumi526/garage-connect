/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // クライアント側 Router Cache の再利用時間（秒）。
    // 一覧→詳細→戻る のような再訪で、キャッシュ済み RSC ペイロードから即時描画し、
    // 毎回のサーバー往復（＝Supabaseクエリ）を避けて遷移体感を軽くする。
    // - dynamic: cookie 依存の動的ページ（本アプリの大半）の再利用ウィンドウ。
    //   30秒以内の戻り遷移はキャッシュから即描画。
    // - static: loading 境界までのシェル等の保持。
    // テナント分離は安全: Router Cache はブラウザセッション単位（＝1ログイン＝1テナント）で
    // 既に RLS 通過済みの描画結果のみを保持するため、他テナントのデータは混ざらない。
    // 鮮度も安全: 各 server action は revalidatePath でこのキャッシュを無効化するため、
    // 作成・編集後は再フェッチされ古いデータは残らない。
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
