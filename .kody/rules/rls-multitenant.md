---
title: Multi-tenant RLS isolation
severity: critical
paths:
  - supabase/migrations/**
  - supabase/functions/**
---
クライアントに露出する全 Supabase テーブルは、認証テナント（`tenant_id`）で行レベルにスコープされた
RLS を持つこと（Garage Connect は Supabase Auth ＋ `shop_users` 由来の `auth_tenant_id()` で
`tenant_id = auth_tenant_id()` に絞る Shared DB / Shared Schema + RLS 方式）。
テナント跨ぎで他社の顧客・車両・車検・予約・通知ログ等を read/write しうる
新テーブル・ポリシー・クエリ（service_role の不用意な使用・RLS 未設定・`tenant_id` 条件の欠落を含む）
を critical として指摘する。
