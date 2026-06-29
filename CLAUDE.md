# Garage Connect — 車屋向けマルチテナント業務 SaaS

> 本ドキュメントは **Claude Code への指示書** 兼 **MVP 詳細設計書** です。
> リポジトリは GitHub Public で運用するため、機密情報の取り扱いに最大限注意してください。
>
> ビジネス背景・要件・ユースケースなど詳細は [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) を参照。

---

## ⚡ 0. Claude Code 実行モード（最初に読む）

### 一気通貫自動実行モード

このプロジェクトは **Claude Code で MVP まで一気に構築する**ことを想定しています。

#### 推奨起動コマンド

```bash
claude --dangerously-skip-permissions
```

> ⚠️ このフラグは全ツール承認をスキップします。**新規プロジェクトの初期セットアップ用途に限定**してください。本番運用フェーズに入ったら必ず外してください。

#### 作業中の方針

| アクション | 確認の有無 |
|-----------|----------|
| ファイル作成・編集 | ✅ 確認不要・自動実行 |
| パッケージインストール（`pnpm add`） | ✅ 確認不要・自動実行 |
| DB マイグレーション（新規テーブル作成・カラム追加） | ✅ 確認不要・自動実行 |
| Git コミット | ✅ Phase 完了ごとに自動コミット |
| ローカル開発サーバー起動 | ✅ 確認不要 |
| Lint / Format 自動修正 | ✅ 確認不要 |
| **既存テーブルの DROP / DELETE** | ❌ 必ず確認 |
| **`git push --force`** | ❌ 必ず確認 |
| **本番デプロイ** | ❌ 必ず確認 |
| **外部 API キー取得** | ❌ ユーザー手動作業 |
| **Stripe 本番モード切替** | ❌ 必ず確認 |

#### エラー発生時の振る舞い

1. エラーログを読み、原因を推測
2. 一般的なリカバリー（依存関係再インストール、キャッシュクリア等）を試行
3. 3 回試行して解決しなければ、状況を整理して人間に判断を仰ぐ
4. **絶対に勝手にデータを削除して解決を試みない**

#### Phase 完了時の進捗報告フォーマット

```markdown
## ✅ Phase X 完了

### 実装内容
- ...

### 次にユーザーが手動で行う必要がある作業
- [ ] ...

### 既知の課題
- ...

### Phase X+1 に進みますか？
```

---

## 🤖 自走運用ポリシー（/run・/next・/ship が参照）

MVP 構築後の継続開発は、Notion バックログ駆動で自走する。`/run`（連続）・`/next`（1件）・`/ship`（本番反映）はこのポリシーに従う。

### プロジェクト固有値
- **スタック**: Next.js 14（App Router・SSR/RSC）/ Supabase / LINE Messaging API / Stripe / pnpm workspace（アプリは **`apps/web` 1本**）。webhook・cron は **Next.js の API route handlers**（Supabase edge functions は不使用）。
- **本番 Supabase ref**: `ezgktyhxnoimczbhokkv`（東京）
- **Vercel プロジェクト**: `garage-connect`（単一アプリ・Root Directory=`apps/web`・リージョン hnd1）
- **GitHub**: `Isumi526/garage-connect`（public）。`main`=本番（**手動 `vercel --prod --scope stism` でデプロイ・git自動デプロイは未配線**）/ `dev`=統合用。
- **バックログ**: 複数プロジェクト共用の Notion DB（`バックログ管理`）。自案件は `.env` の `BACKLOG_PROJECT_ID`（案件page_id）で絞る。盤面取得は `node --env-file=.env scripts/next-target.mjs`（notion-search は使わない）。
- **ローカル開発**: 別ポートのローカル Supabase（API 55321 / Studio 55323 / DB 55322）で隔離起動（`supabase/config.toml` のポート変更はローカル作業ツリーのみ・コミットしない）。

### Pipeline設定（/run・/review の `{{...}}` プレースホルダ実値）
`/run`・`/review` は以下を参照する（`{{...}}` ＝この表 ＋ `.env`）。
- **APP_LAYOUT**: pnpm workspace モノレポ（`pnpm-workspace.yaml: packages: apps/*`）。実体アプリは **`apps/web` 1本**。root scripts が `pnpm --filter web ...` に委譲。
- **TYPECHECK**: `pnpm typecheck`（= `pnpm --filter web typecheck` = `tsc --noEmit`）。
- **BUILD**: `pnpm build`（= `pnpm --filter web build` = `next build`）。
- **TEST**: `pnpm test`（= `pnpm --filter web test` = `vitest run`）。加えてフェーズ検証 `scripts/verify-*.mjs`（`verify:rls` / `verify:phase2..5`）を該当変更時に実行。**E2E 専用スイートは未整備**。
- **PLAYWRIGHT_PROJECTS**: **none**（`playwright.config.*` 無し。Playwright 段はスキップ）。
- **LOCAL_STACK**: ローカル Supabase（別ポート＝ API `55321` / DB `55322` / Studio `55323`）。`supabase start` で起動。DB 接続は `.env` の `LOCAL_DB_URL`（`rls-audit.mjs` 既定 55322）。**none ではない**＝E2E/DB 検証・RLS 監査は local を保証してから実行。
- **MIGRATIONS_DIR**: `supabase/migrations/`（追加のみ DDL。`supabase db push` 禁止＝個別 SQL 適用のみ）。
- **DEPLOY_PLATFORM**: Vercel（プロジェクト `garage-connect`・scope `stism`・Root=`apps/web`・hnd1・本番ドメイン `https://garage-connect-bice.vercel.app`）。**本番デプロイは手動 CLI `vercel --prod --scope stism` のみ＝git連携の自動デプロイは未配線**（`main` に push/Merge しても自動デプロイされない）。dev/main とも preview/自動反映なし＝品質担保はローカル検証＋デプロイ後の本番スモーク。Cron は `apps/web/vercel.json`（`/api/cron/daily-notifications` 毎日・Bearer `CRON_SECRET`）。
- **DEV_URL**: `http://localhost:3000`（`pnpm dev`）。
- **PROD_BRANCH**: `main`／**AUTO_MERGE_TARGET**: `dev`／**AUTO_TIER**: `低`（レビュー不要で本番待ちへ自動マージできる最大リスク階層）／**MAX_WALL**: `180`分（回路遮断）。
- **DEPLOY_TRIGGER**: `manual-cli`（`main` Merge では自動デプロイされない）。**DEPLOY_CMD**: `vercel --prod --scope stism`。**PROD_URL**: `https://garage-connect-bice.vercel.app`。
- **APP_LAYOUT_NOTES**（/review が参照）: 単一アプリ `apps/web`（Next.js・管理画面 `(dashboard)` ＋ 顧客 LIFF `(liff)`）。起動 `pnpm dev`（{{DEV_URL}}）。画面パス例: `/customers`(顧客) `/vehicles`(車両・車検) `/notifications`(通知) `/bookings`(予約) `/templates`(通知テンプレ) `/settings`(設定) `/(liff)/booking`(LIFF予約)。外部送信媒体＝**LINE**（テナント別 OA・通知/リマインド）。実機固有＝LINEアプリ内（友だち追加導線・トーク内 LIFF 起動・Flex メッセージ体裁）。本番ref `ezgktyhxnoimczbhokkv`／本番URL `https://garage-connect-bice.vercel.app`。スモークの認可ガード疎通対象＝`/api/line/webhook/[tenantId]`(署名)・`/api/stripe/webhook`(署名)・`/api/cron/daily-notifications`(Bearer `CRON_SECRET`)。
- **RLS構成メモ**: Shared DB / Shared Schema + RLS。クライアント露出テーブルは `tenant_id = auth_tenant_id()`（`auth_tenant_id()` は `shop_users` から `auth.uid()` のテナントを引く）でスコープ。RLS は初期 migration `20260601000002_rls_policies.sql` から全テーブルで有効。`rls-audit.mjs` で「anon到達可×RLS無効」を機械監査（既知許容は `.kody/accepted.yml`＝現状空）。
- **LINE/外部構成メモ**: テナント別 LINE 公式アカウント（Channel Token を `pgcrypto`/AES-GCM 暗号化保存）。Webhook=`apps/web/app/api/line/webhook/[tenantId]`（署名検証）／Stripe=`api/stripe/webhook`（署名検証）／LIFF 顧客導線=`(liff)` route group ＋ `api/liff/*`／OCR=`api/ocr/extract`。
- **Gemini二重レビュー**: `scripts/independent-review.mjs`（`.env` の `GEMINI_REVIEW_API_KEY`／`GEMINI_REVIEW_MODEL`）。ルールは `.kody/rules/*.md`。

### 自走ポリシー（境界）
- **可逆 ＆ dev 内の作業 = 自走**（設計→実装→ローカル検証→dev マージまで人に聞かず進める）。
- **不可逆・本番影響・意図/業務判断が要るもの = 人**（勝手に決め打ちしない）。
  - (A) 意図が曖昧で人にしか決められない → 人ボール「要回答」（質問＋案）に記録してスキップ。
  - E2E/検証が 3 回直しても緑にならない → 人ボール「要対応」に記録してスキップ。

### /run の優先順位決定ロジック（毎ループこの順で対象を選ぶ）
判定・着手は **この案件（`.env` の BACKLOG_PROJECT_ID）で絞った範囲のみ**。盤面は `scripts/next-target.mjs`（Ready）＋同じ案件名 relation フィルタで 未整理/要回答/進行中/レビュー待ち/本番待ち を取得。`/run` は既定で**実装まで自走**する（要件化だけで止まらない）。詳細は `.claude/commands/run.md`。
0. **自己修復**：自案件で「🤖AI実行中」タグが残っていれば全除去（前回クラッシュ／中断の取り残し掃除）。
1. **中断中の 進行中**（再開可能な CC 痕跡あり）= 仕掛りを先に終わらせる。再開→実装→ローカル検証→dev マージ→**レビュー待ち**まで運ぶ。
2. **未整理の棚卸し（速い）**：優先順位順に **1件ずつ** 判定（安いので先に全件流す）：
   - **(a)** 意図・業務判断が必要（仕様が曖昧で人にしか決められない／設計メモ・既存コードからも一意に取れない）／**本文が空・不足で要件化の材料が無い** → **当該 page_id のステータスを「要回答」に更新**し人ボールに記録（質問＋案）、**実装しない・LINE通知**、回答フロー2（要回答ルート）入口へ流す。※既に「要回答」なら二重発火しない。**止まらず次へ**。
   - **(b)** 情報十分で要件化できる（本文＋既存コードからストーリー＋AC＋スコープを一意に起こせる） → CC が要件化 → ステータスを **要件定義済み** に更新＋**優先度タグ（緊急/高/中/低）を付与**（途中で意図必須と判明したら (a) に格下げ）。
3. **要件定義済み(Ready)を実装**：優先順位順（緊急>高>中>低、同率は作成日古い順）で、**着手したらまず Notion ステータスを「進行中」に更新＋タグ付与**してから設計・実装。**実装→ローカル検証→dev マージ→レビュー待ち**を上限まで連続で回す。
4. **進行中も 未整理も 要件定義済みも無い** → 本当に手が無いので停止して報告（LINE通知）。
- **技術・手続き的判断は自分で決めて記録**（検証環境のローカルスタック起動・技術選定・スコープ等は既存パターンで決め、「決定と理由」を1行記録）。**人にしか決められない業務判断だけ** (a) でパーク。
- **【重要】「未着手（未整理）だから検知できず止まる」状態をなくす。** Ready が無くても未整理から拾って前進（要件化 or 人ボール化）。停止するのは本当に手が無い時（or 上限到達）だけ。「Ready 空 → 必ず停止」は禁止。

### ステータス遷移＋「🤖AI実行中」タグ（Notion 上で「今 AI が実装中のタスク」を可視化）
- 遷移は **要件定義済み →(着手)→ 進行中 →(実装・ローカル検証・dev マージ完了)→ レビュー待ち**。**CC の着地点はレビュー待ちまで**。**レビュー待ち→本番待ちの昇格は人間承認のみ**（CC は昇格しない）。本番反映（本番待ち→デプロイ）は **/ship 専用**（本番待ちのみを拾う＝未レビューは構造上拾えない）。
- **着手した瞬間に「進行中」に更新**し、**同時にタグ「🤖AI実行中」を付与**（既存タグは保持＝追加するだけ）。これで Notion の「🤖 AI実行中」ビューに、今まさに CC が実装中のタスクだけが映る（人の手作業は「進行中」でもこのタグが無いので映らない）。原則 **同時に「進行中」＋タグが付くのは1件**（1タスクずつ自走するため）。
- **タスクを手放す時はタグ「🤖AI実行中」を外す**：レビュー待ちに更新する時／人ボール化してスキップする時／中断する時。
- **/run 開始時（ループに入る前に1回）**：自案件のタスクに「🤖AI実行中」タグが残っていれば全て外す（前回クラッシュ等の取り残しを自己修復）。
- ステータス更新・タグ操作は Notion API（`notion-update-page` のプロパティ更新）または既存スクリプトで行う。**タグは multi_select「タグ」の既存配列を読み、`🤖AI実行中`（絵文字込み・完全一致）を追加/削除して書き戻す**（他のタグは消さない）。
- 実装・ローカル検証・dev マージが完了したら **「レビュー待ち」** に更新（＋タグ除去）。CC はここまで（本番待ちへの昇格は人のレビュー承認のみ）。

### ユーザー直接指示のチケット化（Notion を正本に・完了まで追跡）
/run 中や通常会話で **ユーザーが直接実装タスクを指示した場合も、一定規模以上は Notion バックログを正本として記録し、ステータスを完了まで辿る**（Notion で一貫管理し、「🤖 AI実行中」ビュー・全体ボードに反映させるため）。

**チケット化する**（直接指示でも）：
- **機能追加**（新しい画面・機能・エンドポイント等）
- **バグ修正**（挙動の不具合を直すもの）
- その他、後から「何をやったか」を追えるようにすべき規模の変更

**チケット化しない**（口頭指示のまま実装してよい）：
- タイポ・文言・色・余白などの軽微な見た目修正
- 1〜数行の些細な調整、設定値の変更
- 調査・確認・質問への回答など、成果物が残らない作業
- 既存チケット作業中に付随する細かい修正（そのチケット内で処理）

→ **判断に迷う規模ならチケット化する側に倒す**（記録を残す方が安全）。

**タイミング**：実装前でも、実装しながら／完了後でもよい（CC が適宜判断）。ただし **完了時には必ず Notion に存在し、ステータスが少なくとも「レビュー待ち」（以降は人のレビュー承認→本番待ち→完了）**になっている状態にする。

**手順**：
1. Notion バックログにタスクを作る：案件＝自案件（BACKLOG_PROJECT_ID）、エピックは内容に応じ設定、タグは「機能追加」or「バグ」等。**タスク名＋ストーリー＋AC＋スコープ**をユーザー指示から起こす。仕様に意図確認が要れば人ボール（要回答）で確認。
2. 着手時：ステータス「進行中」＋「🤖AI実行中」タグ。
3. 実装 → ローカル検証 → dev マージ →「レビュー待ち」に更新（タグを外す）。**本番待ちへの昇格は人のレビュー承認**。
4. /run 通常フローと同じ品質担保（ローカル E2E 全 green・本番スモーク）に乗せる。

### 本番 migration 適用
- **人の明示承認 ＋「追加のみ DDL」に限り CC が psql で実行可**（`.env` の `SUPABASE_PROD_DB_URL`、値はログ/チャットに残さない）。
- **破壊的（DROP/DELETE/TRUNCATE/UPDATE/型変更/NOT NULL 追加 等）を1つでも含むなら CC は実行せず、人手の SQL エディタ実行＋事前バックアップ**を促して停止。
- 適用は **本番デプロイ（手動 `vercel --prod`）より前**に行う（Merge では自動デプロイされないため、適用は「デプロイ前」が正しい順序）。`supabase db push` は禁止（個別 SQL 適用のみ）。

### Merge ＋ 本番デプロイ（本番反映ゲート）
- 本番反映は **dev → PR → main → 手動デプロイ**。**CC は main へ直接 push しない**。
- **Merge は、人がタイミングを明示承認（「今 Merge して」等）した時のみ** CC が `gh pr merge` で実行する。それ以外は待機。
- **Merge では自動デプロイされない**（git連携未配線）。**本番反映の実体は手動 `vercel --prod --scope stism`**＝人の明示承認（「deploy して」等）後にのみ CC が実行する。追加のみ migration は**デプロイより前**に適用。詳細は `/ship`（`.claude/commands/ship.md`）。

### 停止 ＝ LINE 通知（例外なし）
- 人の入力・操作・承認待ちで止まる時は、**直前に必ず** `node scripts/notify-humanball.mjs`（best-effort・失敗無視）。
- **「対話中だから」を理由にスキップしない**（見られているか判断できないため常に通知）。1停止で複数承認をまとめる時のみ通知を1回にまとめる。
- 通知の `--task` には素のタスク名を渡せばよい（スクリプトが自動で **[Garage]** を付与。複数プロジェクト共用の LINE チャンネルで判別するため）。

### 人ボール報告フォーマット（必須）
人ボール（要回答/要対応/ship承認）を人に提示する時は、**結論を先頭**に置き、必ず次の構造で出す。長い経緯説明から始めない。

```
━━━━━━━━━
🙋 [種別] タスク名
【決めてほしいこと】（1行。何を判断すればいいか）
【選択肢】
  A. （短く）
  B. （短く）
  C. （あれば）
【推奨】X — 理由1行
━━━━━━━━━
（背景・詳細が要る時だけ、上記の下に最小限で。長い経緯は書かない）
```

ルール：
- **結論（決めてほしいこと＋選択肢）を必ず最初**に。背景説明から始めない。
- 人が **「Aで」「Bで」と一語で答えられる**状態にする。自明に絞れない時だけ自由回答を求める。
- 選択肢は **2〜4個、各1行**。長い説明を選択肢に書かない。
- 推奨は **1行＋理由1行**まで。
- 複数の人ボールをまとめる時は、各々をこの構造で**番号付き**に並べる（散文にしない）。
- **画面（CC出力）と LINE 通知（`--detail`）の両方**に適用。**LINE は特に短く**：`種別＋タスク名＋「A/B/Cどれ？推奨X」`が一目で分かる **1〜2行**に圧縮する。

### 品質担保
- **ローカル検証を全 green**：`pnpm test`（vitest）＋ 必要に応じ `scripts/verify-*.mjs`。dev は Vercel preview 無効のため preview URL は使わない／案内しない。
- **Merge 後の本番スモーク（ハードリロード必須）**：Cmd/Ctrl+Shift+R。直後は旧バンドルがキャッシュされ、ハードリロードしないと誤判定する。

---

## 🔒 1. 機密情報の取り扱いルール（絶対遵守）

このリポジトリは **GitHub Public** で公開されます。以下を**絶対にコミットしてはいけません**。

### コミット禁止リスト

- `.env`, `.env.local`, `.env.production` 等の環境変数ファイル本体
- Supabase の `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` / DB 接続文字列
- LINE の `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`
- Stripe の `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- テナント固有の LINE Channel ID / Channel Secret（DB に暗号化保存）
- 顧客個人情報を含むサンプルデータ（実在の氏名・住所・電話番号・車検証画像）
- AWS / GCP / Vercel のシークレット
- `.vscode/`, `.idea/` の個人設定（`.example` テンプレは可）
- `node_modules/`, `.next/`, `dist/` 等のビルド成果物
- マイグレーション用の本番データダンプ

### 作業時のルール

1. **新しい環境変数を追加する時は、必ず `.env.example` も更新**（値はプレースホルダ）
2. **コード内に API キー・トークンを直接書かない**。常に `process.env.XXX` 経由
3. **コミット前に `git diff --cached` で機密情報をチェック**
4. **テストデータは必ずダミー**（`山田太郎`、`090-0000-0000`、`テスト市テスト町1-1-1`）
5. **README に Supabase / LINE / Stripe の具体的なプロジェクト ID を書かない**
6. ドキュメント内のサンプル UUID は `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` 形式
7. **顧客（車屋）の実名・連絡先を要件定義書を含むあらゆる公開ファイルに書かない**

### 万が一コミットしてしまった場合

1. 即座にそのキー・トークンをローテーション（Supabase / LINE / Stripe 管理画面で再発行）
2. `git filter-repo` または BFG Repo-Cleaner で履歴削除
3. `git push --force`（**この操作のみ、必ずユーザー確認**）

---

## 2. プロジェクト概要

### ミッション

車屋（自動車整備工場・ディーラー）の顧客接点を **ハガキから LINE へ移行する** マルチテナント SaaS。

### 解く課題

1. ハガキでの車検・点検案内は**コスト高・反応率低・見落とされやすい**
2. 既存 SaaS（CarRide, GATCH 等）は**高額 or LINE 非対応**
3. **法人顧客のフリート管理**機能が既存ソフトで弱い

### プロダクトコンセプト

> **「車屋の顧客接点を LINE に統一する、軽量マルチテナント SaaS」**

CarRide 等は「整備士の事務処理」を狙ってるが、Garage Connect は「**車屋の顧客接点**」を狙う。共存できる補完レイヤーとして設計。

### ターゲットユーザー

- **主**: 従業員 10 名以下の地域整備工場・ディーラー
- **副**: フリーランス整備士
- **顧客側**: 個人 + 法人（フリート保有）

### 料金プラン（仮）

| プラン | 月額 | 機能 |
|--------|------|------|
| Free Trial | ¥0 | 30 日間、顧客数 20 件まで |
| Standard | ¥3,000 | 無制限、基本機能 |
| Pro（Phase 2 以降） | ¥8,000 | + 電子契約 + 法人向け機能 |

---

## 3. 技術スタック

### フロントエンド

- **Next.js 14** (App Router) + **TypeScript**
- **shadcn/ui** + **Tailwind CSS**
- **React Hook Form** + **Zod**
- **TanStack Query**

### バックエンド

- **Supabase**
  - PostgreSQL（データ）
  - Auth（店舗ユーザー認証）
  - Storage（車検証画像、書類 PDF）
  - Edge Functions（バッチ、Webhook）
  - Row Level Security（マルチテナント分離）

### 外部サービス

- **LINE Messaging API**（顧客通知）
- **LIFF**（顧客マイページ・予約）
- **Stripe**（サブスク課金）

### インフラ

- **Vercel**（Next.js）
- **Supabase Cloud**（DB）

### 開発支援

- **pnpm**（パッケージ）
- **Biome**（Lint / Format）
- **Vitest**（テスト）
- **Husky** + **lint-staged**（pre-commit）

---

## 4. アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────┐
│  店舗ユーザー（PC / タブレット）              │
└────────────┬────────────────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────────────────┐
│  Next.js (Vercel) - 店舗管理画面             │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│  Supabase                                    │
│  ├─ PostgreSQL（マルチテナント + RLS）        │
│  ├─ Auth（店舗ユーザー）                     │
│  ├─ Storage（車検証画像、PDF）                │
│  └─ Edge Functions                           │
│      ├─ daily-notification-batch             │
│      ├─ line-webhook                         │
│      └─ stripe-webhook                       │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│  外部サービス                                 │
│  ├─ LINE Messaging API（テナント別）         │
│  ├─ Stripe（サブスク）                       │
│  └─ （Phase 2）電子契約 API                  │
└─────────────────────────────────────────────┘
             ↑
             │
┌────────────┴────────────────────────────────┐
│  顧客（個人 LINE）                            │
└─────────────────────────────────────────────┘
```

### マルチテナント設計：Shared DB / Shared Schema + RLS

- 全テナントが同じ DB / スキーマを共有
- 各テーブルに `tenant_id` カラムを持つ
- Supabase RLS で完全分離

### テナント別 LINE 公式アカウント

- LINE 公式アカウントは**各テナントが個別取得**
- 管理画面で自社の `LINE Channel Access Token` / `Channel Secret` / `Channel ID` を登録
- **`pgcrypto` で暗号化して DB に保存**
- Webhook は Garage Connect 側で受信し、`destination` からテナント特定

---

## 5. データモデル

### DDL

```sql
-- ============================================
-- 拡張機能
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. テナント
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT,
  line_channel_id TEXT,
  line_channel_secret_encrypted TEXT,
  line_channel_access_token_encrypted TEXT,
  liff_id TEXT,
  logo_url TEXT,
  brand_color TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. 店舗ユーザー（Supabase Auth と連携）
-- ============================================
CREATE TABLE shop_users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',  -- 'owner' | 'admin' | 'staff'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_users_tenant ON shop_users(tenant_id);

-- ============================================
-- 3. 顧客
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL DEFAULT 'individual',  -- 'individual' | 'corporate'
  name TEXT NOT NULL,
  name_kana TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  birthday DATE,
  corporate_name TEXT,
  representative_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);

-- ============================================
-- 4. 法人連絡先
-- ============================================
CREATE TABLE corporate_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'manager' | 'accounting' | 'driver'
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  line_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. LINE 連携
-- ============================================
CREATE TABLE line_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, line_user_id)
);
CREATE INDEX idx_line_connections_customer ON line_connections(customer_id);

-- ============================================
-- 6. 車両
-- ============================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_number TEXT,
  vin TEXT,
  vehicle_name TEXT,
  model_code TEXT,
  first_registration_date DATE,
  registration_date DATE,
  inspection_expiry_date DATE,
  liability_insurance_expiry_date DATE,
  voluntary_insurance_expiry_date DATE,
  voluntary_insurance_company TEXT,
  body_shape TEXT,
  vehicle_weight INTEGER,
  total_weight INTEGER,
  capacity INTEGER,
  displacement INTEGER,
  fuel_type TEXT,
  current_mileage INTEGER,
  last_mileage_recorded_at DATE,
  inspection_certificate_image_path TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_vehicles_expiry ON vehicles(tenant_id, inspection_expiry_date)
  WHERE status = 'active';

-- ============================================
-- 7. 整備履歴
-- ============================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  performed_at DATE NOT NULL,
  next_due_date DATE,
  mileage INTEGER,
  amount INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);

-- ============================================
-- 8. 通知テンプレ
-- ============================================
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'line',
  title TEXT,
  body TEXT NOT NULL,
  flex_message_json JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, trigger_type, channel)
);

-- ============================================
-- 9. 通知配信ログ
-- ============================================
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);
CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id, sent_at DESC);
CREATE INDEX idx_notification_logs_vehicle ON notification_logs(vehicle_id);

-- ============================================
-- 10. 予約
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id, preferred_date);

-- ============================================
-- 11. 書類
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES shop_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_customer ON documents(customer_id);

-- ============================================
-- 12. サブスクリプション
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- updated_at 自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_users_updated_at BEFORE UPDATE ON shop_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
-- RLS 有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM shop_users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- 各テーブル同一パターンのポリシー（customers の例。他テーブルも同様にマイグレーション内で展開）
CREATE POLICY "Tenant isolation - select"
  ON customers FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "Tenant isolation - insert"
  ON customers FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "Tenant isolation - update"
  ON customers FOR UPDATE USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "Tenant isolation - delete"
  ON customers FOR DELETE USING (tenant_id = auth_tenant_id());
```

---

## 6. ディレクトリ構成

```
garage-connect/
├── .github/workflows/ci.yml
├── apps/web/
│   ├── app/
│   │   ├── (auth)/{login,signup}/
│   │   ├── (dashboard)/{customers,vehicles,notifications,bookings,templates,settings}/
│   │   ├── (liff)/{booking,history}/
│   │   ├── api/{line/webhook,stripe/webhook,ocr}/
│   │   └── layout.tsx
│   ├── components/{ui,customers,vehicles,shared}/
│   ├── lib/{supabase,line,stripe,crypto,qr,utils,validations}/
│   ├── hooks/
│   └── types/
├── supabase/
│   ├── migrations/
│   ├── functions/{daily-notification-batch,line-webhook,stripe-webhook}/
│   └── config.toml
├── docs/{REQUIREMENTS.md,ARCHITECTURE.md,DEVELOPMENT.md}
├── scripts/seed.ts
├── .env.example
├── .gitignore
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── README.md
├── LICENSE
└── CLAUDE.md
```

---

## 7. 実装フェーズ

### Phase 0: プロジェクトセットアップ

1. monorepo 構成（`pnpm-workspace.yaml`）
2. Next.js 14 + TypeScript + Biome + Tailwind + shadcn/ui
3. Supabase ローカル環境（`supabase init`）
4. `.gitignore`、`.env.example`
5. GitHub Actions（Lint + 機密情報スキャン）
6. Husky + lint-staged
7. 初回コミット

**完了条件**:
- `pnpm dev` で `localhost:3000` 起動
- `pnpm supabase start` でローカル Supabase 起動
- `pnpm lint` がパス

### Phase 1: 認証 + マルチテナント基盤

1. Supabase Auth（メール/パスワード）
2. 全テーブル DDL マイグレーション
3. RLS ポリシー設定
4. テナント作成フロー（サインアップ時にテナント新規作成）
5. ユーザー招待フロー
6. dashboard レイアウト・ナビゲーション

**完了条件**:
- 2 テナントでサインアップ
- 別テナントのデータが見えないことを確認

### Phase 2: 顧客・車両管理

1. 顧客 CRUD
2. 車両 CRUD
3. 車検証 QR スキャン（`@zxing/browser`）
4. 連結 QR 解析（国交省仕様、② ③ ④ と ⑤ ⑥ を結合）
5. QR からの自動入力
6. 車両一覧（車検満了日順）
7. 顧客検索・フィルタ
8. CSV インポート

**完了条件**:
- ダミー車検証 QR で顧客 + 車両が一発登録
- 車検満了日順で並ぶ

### Phase 3: LINE 連携 + 通知システム

1. LINE 公式アカウント設定画面（Channel Token 入力）
2. `pgcrypto` でトークン暗号化保存
3. LINE Webhook 受信
4. 友だち追加 → 顧客紐付け
5. 通知テンプレ管理（変数置換）
6. デフォルトテンプレ自動生成
7. 日次バッチ Edge Function（pg_cron）
8. 配信ログ表示

**完了条件**:
- テストテナントから LINE 通知が届く
- 配信ログ記録される

### Phase 4: LIFF 予約システム

1. LIFF セットアップ
2. テナント識別パラメータ
3. 顧客マイページ
4. 予約フォーム
5. 予約管理画面
6. 予約確定通知

**完了条件**:
- LIFF から予約 → 店舗側に表示

### Phase 5: Stripe + ローンチ準備

1. Stripe Subscription 実装
2. Customer 作成、Webhook 処理
3. プラン制限実装
4. 利用規約・プライバシーポリシー
5. ランディングページ

**完了条件**:
- テストカードで決済できる
- 法務ページが存在する

**MVP 合計目安：5〜6 週**

---

## 8. 重要機能実装方針

### 8.1 車検証 QR コード読み取り

```typescript
// lib/qr/inspection-certificate-parser.ts
export interface ParsedInspectionCertificate {
  vehicleNumber: string;
  vin: string;
  registrationDate: string;
  firstRegistrationDate: string;
  inspectionExpiryDate: string;
  ownerName: string;
  ownerAddress: string;
}

export function parseConnectedQRCodes(
  qrTexts: string[]
): ParsedInspectionCertificate {
  // 国交省仕様：② ③ ④ と ⑤ ⑥ を連結してデコード
}
```

### 8.2 LINE クライアント（テナント別）

```typescript
// lib/line/client.ts
import { Client } from '@line/bot-sdk';
import { decrypt } from '@/lib/crypto';
import { createServerClient } from '@/lib/supabase/server';

export async function getLineClientForTenant(tenantId: string) {
  const supabase = createServerClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('line_channel_access_token_encrypted, line_channel_secret_encrypted')
    .eq('id', tenantId)
    .single();
  
  if (!tenant) throw new Error('Tenant not found');
  
  return new Client({
    channelAccessToken: decrypt(tenant.line_channel_access_token_encrypted),
    channelSecret: decrypt(tenant.line_channel_secret_encrypted),
  });
}
```

### 8.3 暗号化ヘルパー

```typescript
// lib/crypto/index.ts
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(encryptedBase64: string): string {
  const buf = Buffer.from(encryptedBase64, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
```

### 8.4 LINE Webhook

```typescript
// app/api/line/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature');
  const event = JSON.parse(body);
  
  // destination からテナント特定
  const channelId = event.destination;
  const tenant = await findTenantByChannelId(channelId);
  
  // 署名検証
  if (!validateSignature(body, signature, tenant.channelSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // イベント処理
  for (const evt of event.events) {
    switch (evt.type) {
      case 'follow': await handleFollow(tenant.id, evt); break;
      case 'unfollow': await handleUnfollow(tenant.id, evt); break;
      case 'postback': await handlePostback(tenant.id, evt); break;
    }
  }
  
  return new Response('OK', { status: 200 });
}
```

### 8.5 日次バッチ通知

```typescript
// supabase/functions/daily-notification-batch/index.ts
// pg_cron で毎日 09:00 JST 実行

import { createClient } from 'jsr:@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // 全テナント走査
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .eq('status', 'active');
  
  for (const tenant of tenants ?? []) {
    // トリガー別に対象車両を抽出
    // 車検満了 60 / 45 / 30 日前
    // 12 ヶ月点検 30 日前 etc
    // LINE 配信
    // notification_logs 記録
  }
  
  return new Response('OK');
});
```

---

## 9. コーディング規約

- TypeScript: `any` 禁止、`unknown` + 型ガード推奨
- Zod でランタイムバリデーション
- React: Server Component 優先、必要時のみ `'use client'`
- ファイル: `kebab-case.tsx`、コンポーネント: `PascalCase`
- カスタムフック: `use` プレフィックス
- Supabase: クライアント側は Anon Key + RLS、Service Role は最小限
- コミット: Conventional Commits（`feat:`, `fix:`, `chore:`, `docs:`）

---

## 10. ユーザーが手動で行う作業

Claude Code では実行できないため、Phase 完了時にこれを案内する：

### 初回セットアップ
1. **Supabase プロジェクト作成**（https://supabase.com）→ URL、Anon Key、Service Role Key を `.env.local` に設定
2. **LINE Developers アカウント作成** → Messaging API チャネル + LIFF アプリ作成 → LIFF ID を `.env.local` に設定
3. **Stripe テストアカウント作成** → Publishable Key、Secret Key を `.env.local` に設定
4. **暗号化キー生成**:
   ```bash
   echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.local
   ```

### Phase 別
- Phase 0 後: Supabase プロジェクト作成、`.env.local` 初期設定
- Phase 1 後: テストテナントでサインアップ
- Phase 3 後: テスト用 LINE 公式アカウント取得、Channel Token 登録
- Phase 5 後: Vercel デプロイ、本番ドメイン設定

---

## 11. Claude Code 作業フロー

1. **作業開始**: CLAUDE.md と `docs/REQUIREMENTS.md` を読む
2. **Phase 0 から順に進める**（飛ばさない）
3. **各 Phase 完了時**:
   - 自動コミット（`feat: complete phase X - <要約>`）
   - 進捗報告（フォーマット参照）
   - 次 Phase に進んでよいかユーザー確認
4. **エラー時**: 3 回リカバリー試行 → だめなら報告
5. **コミット前**: `git diff --cached` で機密情報確認

---

## 12. 法令・コンプライアンス

- **個人情報保護法**: 車検証は機微情報、プライバシーポリシー必須
- **電子帳簿保存法**: 請求書 PDF は検索可能形式で 7 年保管
- **特定電子メール法**: メール送信時は配信停止リンク必須
- **LINE 利用規約**: 商用利用は公式アカウントの該当プラン契約必須

---

## 13. 参考リンク

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [LIFF](https://developers.line.biz/ja/docs/liff/)
- [Stripe Docs](https://stripe.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

**このドキュメントは「生きたドキュメント」です。実装が進むにつれて随時更新してください。**
