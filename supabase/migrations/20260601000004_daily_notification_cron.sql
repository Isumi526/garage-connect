-- ============================================================
-- 日次通知バッチの定期実行（pg_cron + pg_net）
-- ============================================================
-- 毎日 09:00 JST(=00:00 UTC) に通知エンドポイントへ POST する。
-- 本番では以下を Vault / DB 設定に登録してから有効化すること：
--   app.settings.app_url     … 例 https://app.example.com
--   app.settings.cron_secret … CRON_SECRET と同じ値
--
-- ローカル開発では拡張が無い/外部到達できないため、この migration は
-- 拡張が利用可能な場合のみジョブを登録する（無ければスキップ）。
-- 手動実行は管理画面「配信ログ → 通知を今すぐ実行」または
--   POST /api/cron/daily-notifications  (Authorization: Bearer <CRON_SECRET>)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN

    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;

    -- 既存ジョブがあれば貼り替え
    PERFORM cron.unschedule('daily-notification-batch')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-notification-batch');

    PERFORM cron.schedule(
      'daily-notification-batch',
      '0 0 * * *', -- 00:00 UTC = 09:00 JST
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.app_url', true) || '/api/cron/daily-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron/pg_net が無いため日次ジョブ登録をスキップしました（ローカル開発想定）';
  END IF;
END;
$$;
