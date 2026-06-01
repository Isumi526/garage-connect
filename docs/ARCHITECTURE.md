# Garage Connect アーキテクチャ補足

CLAUDE.md の設計を補完する、実装上の判断と注意点をまとめる。

## ランタイム構成（Phase 3）

- **LINE Webhook** と **日次通知バッチ** は Deno Edge Function ではなく
  **Next.js Route Handler** で実装している。
  - 理由: 単一ランタイム / 単一の暗号実装（`lib/crypto`, AES-256-GCM）/ ローカルで
    テスト可能。
  - Webhook: `POST /api/line/webhook/[tenantId]`（テナント別 URL で `destination`
    の曖昧性を回避し、Channel Secret で署名検証）
  - 日次バッチ: `GET|POST /api/cron/daily-notifications`（`Authorization: Bearer
    CRON_SECRET`）。`supabase/migrations/*_daily_notification_cron.sql` の pg_cron +
    pg_net から毎日 09:00 JST に呼び出す（本番は `app.settings.app_url` /
    `app.settings.cron_secret` を設定）。Vercel Cron でも代替可。

## LIFF（Phase 4）

### テナント識別と URL パラメータ消失対策

- 単一 LIFF アプリ + クエリ `?t=<tenantId>` でテナントを識別する。
- `liff.login()` のリダイレクトで `?t=` が失われることがあるため、`lib/liff/client.ts`
  で以下を行う:
  1. `?t=` を `localStorage`（`gc_liff_tenant`）へ退避
  2. `liff.login({ redirectUri: <現在URL(?t=込み)> })` で復帰先を明示
  3. 復帰時は URL → localStorage の順でテナントIDを復元

### 顧客紐付け（line_connections の再利用）

- Phase 3 の `line_connections` を LIFF からも参照する（`lib/liff/session.ts`）。
- セッション状態は 3 値:
  - `no_user`: LINE 外で開いた等で userId を特定できない → 「LINE アプリ内で開いて」案内
  - `unlinked`: 友だち追加済みだが顧客未紐付け → 店舗での紐付け案内画面
  - `linked`: マイページ・予約フォームを表示
- 紐付けは店舗側 `設定 → LINE 設定` の「友だちの顧客紐付け」で行う。

### ⚠️ userId のチャネルスコープに関する注意

LINE の userId は **チャネル（プロバイダー）スコープ**。単一 LIFF アプリのログイン
チャネルで得る userId と、テナント別 Messaging チャネルの webhook で得た userId は、
**同一プロバイダー配下でない限り一致しない**。

本番運用では次のいずれかが必要:
- LIFF ログインチャネルと各テナントの Messaging チャネルを同一プロバイダーに収める、
- もしくはテナントごとに LIFF を発行して `?t=` 相当をテナント別 LIFF にマッピングする。

MVP / ローカル検証では `LIFF_ALLOW_DEV_USER=true` のとき `?u=<userId>` を
そのまま採用するモックモードで動作確認している（本番では必ず無効化）。

### タイムゾーン（JST 統一）

- 予約は **日付のみ（`<input type="date">` の YYYY-MM-DD）+ 時間帯スロット**で扱い、
  `Date.toISOString()` による UTC 変換を避けることで日付ズレを防止（`lib/utils/timezone.ts`）。

## 顧客→店舗の通知（MVP）

- 予約成立時の店舗側通知は、ダッシュボード ナビの **未確認予約バッジ**（pending 件数）で代替。
- LINE プッシュ等の店舗向け能動通知は将来対応（要件定義書の Phase 2 相当）。
