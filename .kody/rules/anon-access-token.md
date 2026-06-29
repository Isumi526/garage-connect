---
title: External/anon access must verify token
severity: critical
paths:
  - apps/web/**
  - supabase/functions/**
  - supabase/migrations/**
---
未認証アクセス可能なルート／ページ／RLS ポリシー（LINE Webhook・Stripe Webhook・LIFF 顧客導線
（予約・履歴）・OCR・cron エンドポイント等の外部到達導線を含む）は、推測困難なトークン
（UUID／署名／LIFF IDトークン／ハッシュ）を要求し、行レベルで照合すること。
LINE/Stripe Webhook は署名検証（x-line-signature / Stripe-Signature）必須、LIFF は IDトークン検証必須。
obscurity 依存（URL を知っていれば見える）・token/署名 照合なしの anon 可読を critical として指摘する。
