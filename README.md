# Garage Connect

> 車屋向けマルチテナント業務 SaaS — ハガキ案内を LINE に置き換える、軽量な顧客接点プラットフォーム

[![CI](https://github.com/USERNAME/garage-connect/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/garage-connect/actions/workflows/ci.yml)

## 概要

Garage Connect は、自動車整備工場・ディーラー向けのマルチテナント SaaS です。  
紙のハガキで行われている車検・点検案内を LINE 配信に置き換え、顧客接点のデジタル化を支援します。

### 主な特徴

- 🔔 車検・点検満了日に応じた自動 LINE 通知
- 📋 車検証 QR コードスキャンによる顧客・車両登録
- 🏢 法人顧客のフリート管理（複数車両一元管理）
- 💳 Stripe によるサブスクリプション課金
- 🔒 Supabase RLS による完全なマルチテナント分離

## 技術スタック

- **Frontend**: Next.js 14 (App Router) / TypeScript / Tailwind CSS / shadcn/ui
- **Backend**: Supabase (PostgreSQL / Auth / Storage / Edge Functions)
- **Integrations**: LINE Messaging API / LIFF / Stripe
- **Hosting**: Vercel

## ドキュメント

- [要件定義書](./docs/REQUIREMENTS.md)
- [開発者向け設計書](./CLAUDE.md)

## セットアップ

### 前提条件

- Node.js 20+
- pnpm（推奨）
- Supabase アカウント
- LINE Developers アカウント
- Stripe アカウント（テスト用で OK）

### ローカル開発手順

```bash
# 1. クローン
git clone https://github.com/USERNAME/garage-connect.git
cd garage-connect

# 2. 依存関係インストール
pnpm install

# 3. 環境変数の設定
#    Next.js は monorepo では apps/web 配下の .env.local を読み込む
cp .env.example apps/web/.env.local
# apps/web/.env.local を編集して各サービスのキーを設定

# 4. Supabase のセットアップ（Docker Desktop 起動が前提）
pnpm supabase start          # ローカルスタック起動（URL/キーが表示される）
pnpm db:reset                # マイグレーション適用

# 5. 開発サーバー起動
pnpm dev

# (任意) RLS テナント分離の検証
pnpm verify:rls
```

開発サーバーは http://localhost:3000 で起動します。

## プロジェクト構成

```
garage-connect/
├── apps/web/          # Next.js アプリ（管理画面 + LIFF）
├── supabase/          # DB マイグレーション + Edge Functions
├── docs/              # ドキュメント
└── CLAUDE.md          # 開発者向け詳細設計書
```

## ライセンス

[MIT](./LICENSE)
