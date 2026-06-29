---
title: Side-effects must not pre-commit status
severity: high
paths:
  - supabase/functions/**
  - apps/web/**
---
LINE 通知/リマインド送信・Stripe 課金等の外部副作用は、成功を確認するまでレコードを
「送信済／配信済／課金済／完了」にしないこと（例: `notification_logs.status` を送信前に成功扱いにしない）。
成功前に status を進める・送信/課金失敗を握り潰す（エラーを無視して成功扱いにする）実装を high として指摘する。
