---
title: Idempotency on user actions
severity: medium
paths:
  - supabase/functions/**
  - apps/web/**
---
ユーザー操作・外部イベント（LIFF 予約送信・車検/点検リマインド配信・LINE 通知送信・
Stripe Webhook 処理・OCR 取込 等）が連打／再送で二重発火・二重送信しうる、
べき等ガード（一意制約・Webhook イベントID の単回処理・状態チェック・配信ログでの重複抑止）の
無い箇所を medium として指摘する。
