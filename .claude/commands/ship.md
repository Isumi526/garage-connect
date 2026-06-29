
garage-connect の本番反映を、各本番操作の承認を取りながら進めるエージェント。

> **【Garage Connect 移植版（GENLINKS/sido → osarAI ハーネスと同型）】** 本番反映は **PR経由 ＋ 手動デプロイ**。Merge は人がタイミングを明示承認した時だけ CC が `gh pr merge`、**本番デプロイ（`vercel --prod --scope stism`）も人承認後に CC が実行**する（＝本番承認ゲート）。CC は PR作成・RLS監査・独立AIレビュー・migration適用・Merge・デプロイ・スモークを行う（各本番操作ごとに人の承認）。品質担保は **ローカルE2E全green＋独立AIレビュー＋RLS監査＋デプロイ後の本番スモーク（ハードリロード必須）**。
> パイプライン依存値（{{PROD_BRANCH}}=main / {{DEPLOY_PLATFORM}}=Vercel / {{DEV_URL}} 等）は **CLAUDE.md「Pipeline設定」** と `.env` を参照する。

> **対象は「本番待ち」のみ**。CC（/run・/next）の完成品は **レビュー待ち** に着地し、**人がレビュー承認して「本番待ち」へ昇格**したものだけが本番反映の対象になる。**レビュー待ち（未レビュー）は /ship が構造上拾わない**（＝未レビューが本番に出ない安全装置）。

> 通知: `notify-humanball.mjs` は task 名に自動で **[Garage]** を付与する（複数プロジェクト共用 LINE チャンネルでの判別用）。
>
> **承認待ちの提示（画面）と `--detail`（LINE）は CLAUDE.md「人ボール報告フォーマット（必須）」に従う**：結論先頭・選択肢 A/B・推奨1行。LINE は `何の承認か＋A.承認(合図) B.保留／推奨X` を **1〜2行**に圧縮する。通知 kind は `ship承認`（Merge/デプロイ/migration タイミング）と `ship-blocked`/`ship-ready`（ゲート判定）で混線させない。

# 前提

- main = 本番、dev = 統合用。本番 Supabase ref = `ezgktyhxnoimczbhokkv`（東京）。本番ドメイン = **https://garage-connect-bice.vercel.app**。
- **本番デプロイは git 連携の自動デプロイ未配線＝手動 CLI のみ**：`vercel --prod --scope stism`（project `garage-connect`・Root=`apps/web`）。**`main` への Merge では自動デプロイされない**（push しても本番反映ゼロ）。よって **Merge と 本番デプロイは別ステップ**（手順6・手順7）。dev/main とも有効な preview URL は出ない → 品質担保は **ローカルE2E全green＋独立AIレビュー＋RLS監査＋デプロイ後の本番スモーク**。
- 本番反映は dev → PR → main。**CCは main へ直接 push しない**。Merge は人がタイミングを明示承認した時だけ CCが `gh pr merge`（main保護＝gh認証経由・人承認前提）。
- **緊急hotfix（main派生）の独立ship**：/run の緊急レーンが作った本番待ちのうち、📋に「**緊急hotfix・ブランチ=`hotfix/<slug>`（main派生・未push）**」と記され、ローカルに `hotfix/*` ブランチがあるものは、**dev を経由せず独立してshipする**（§緊急hotfix独立ship）。通常の本番待ち（dev上）は従来どおり dev→PR→main。
- supabase db push は絶対禁止。DB変更は正式なmigration（追加のみ・後方互換）でのみ。
- **本番migration適用は、人の明示承認＋追加のみDDLに限りCCが psql で実行可**（`.env` の `SUPABASE_PROD_DB_URL`。値はログ/チャットに残さない）。破壊的を1つでも含むなら人手のSQLエディタ実行＋事前バックアップ（CCは実行しない）。適用は **本番デプロイ（`vercel --prod`）より前** に行う（新フロントが未適用スキーマを叩く事故を防ぐ）。
- **リスク別の ship 手数（スモークの深さをリスクで変える）**：差分に含まれる最大リスクで判断。
  - **🟢低のみ**：デプロイ後の本番スモークは「本番URL描画/200・JSエラー無し」の軽確認でOK（ノールック寄り）。
  - **🟡中**：関係画面を本番でハードリロードし、主要動線を1往復。
  - **🔴高/🧱土台（金額・認証・データモデル・外部送信・cross-tenant）**：**本番スモーク必須**。各本文の🧪「ship前スモーク」を本番で実施し、**金額/集計系は変更前後で数値が正しいか**まで見る。**外部送信（LINE配信・Stripe決済）は🔴時のみ・必ず自テナント自分宛・隔離で実施**（通常は手順8の認可ガード疎通＝実送信ゼロで済ます）。
  - 独立AIレビュー(手順4.5)の runs 数も差分リスクで上げる（🔴高は `--runs 3`）。

# 手順

1. プリフライト（読み取りのみ・自動／git状態・dev最新化）:
   - `git log --oneline origin/main..origin/dev` で「本番に乗る差分」を一覧化。
   - 差分に DB migration / API route handlers(webhook/cron)変更 / 破壊的変更 が含まれるか分類して提示。
   - 本番待ちのNotionタスクを一覧化（`node --env-file=.env scripts/next-target.mjs --board` の「本番待ち」グループ）し、今回どれが反映されるか対応づけ。**緊急hotfix（hotfix/* ・main派生・未push）が本番待ちにあれば §緊急hotfix独立ship へ**。
   - 後方互換か・ロールバック可能かのリスク要約を出す。
   - dev を最新化： `git switch dev && git push origin dev`。

2. migrationチェック（事前検知①・読み取りのみ・自動）:
   - `git diff --name-only origin/main...origin/dev` で `supabase/migrations/` 配下の新規/変更ファイルを列挙。
   - **該当あり**：後続のPR本文に「## ⚠️ migration あり」セクションを作り、ファイル名・概要・後方互換性（追加のみか／破壊的か）・本番適用要否を明記する。
     - **「追加のみ」か「破壊的を含む」かを機械的に判定して人に提示**する：
       - 追加のみ＝ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT 等の非破壊DDLのみ。
       - 破壊的＝DROP / DELETE / TRUNCATE / UPDATE / カラム型変更（ALTER ... TYPE）/ NOT NULL追加 等、既存データを失う・壊す可能性が1つでもある。
     - **追加のみ** → 手順5で人の承認後にCCが psql で適用できる（後述）。
     - **破壊的を含む** → CCは適用しない。本番DBのバックアップ取得済みかを確認（★）し、未取得なら促して停止。人手のSQLエディタ実行＋事前バックアップを依頼する。
       - **停止する直前に LINE 通知（best-effort・失敗無視）**：
         `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "破壊的migrationN件あり/A.バックアップ後SQLエディタで手動実行 B.中止／推奨A（CCは適用しない）" [--url "<セッションurl>"]`
   - **該当なし**：後続のPR本文に「migration: なし」と明記する。

2.5 RLS/anon 監査ゲート（決定的・機械的／LLMレビューの二重化・読み取りのみ・自動）:
   - 独立AIレビュー（手順4.5）の RLS/anon 観点を **LLM非依存の機械監査** で二重化する。判定源は **`.kody/accepted.yml`（手順4.5 と共有・現状空）**。
   - **migration適用済の状態**（ローカル＝本番反映後と同一スキーマ。`LOCAL_DB_URL`=55322）に対し実行：`node scripts/rls-audit.mjs --assert`（必要なら `--prod-readonly` で本番を読取専用監査＝SELECTのみ・書込なし）。
   - 判定：**allowlist外で「anon到達可 × RLS無効」= 🔴LEAK** が1件でもあれば `--assert` は非ゼロ終了。
   - **🔴LEAK あり → HALT**（本番反映に進まない）。違反テーブル一覧を提示し、停止直前に LINE 通知：
     `node scripts/notify-humanball.mjs --kind ship-blocked --task "<PRタイトル>" --detail "RLS監査で🔴LEAK N件(anon×RLS無効)/A.RLS有効化migration B..kody/accepted.ymlに追跡追記／推奨A、再実行で続行" [--url "<セッションurl>"]`
     - 人間が「RLS有効化migration追加」または「accepted.yml に追跡を追記」したら、この手順から再実行（再監査→0件で続行）。
   - **🔴LEAK 0 → 続行**。📋に監査サマリ（public表数・LEAK/warn/allowlist件数・verdict）を載せる。

3. PR作成（CCが自動）:
   - PR作成（本文に **migration有無**＝手順2の結果を必ず含める）：
     ```
     gh pr create --base main --head dev \
       --title "release: <本番反映する内容の要約>" \
       --body "<反映タスク一覧（Notion）／migration有無（あり=⚠️セクション/なし=明記）／RLS監査サマリ／後方互換性／スモーク観点>"
     ```
   - 作成後、PRのURLを表示する。

4. 品質担保（ローカルE2E全green・自動／preview は使わない）:
   - 自動デプロイ未配線で **有効な preview URL は出ない** → preview 確認はしない・案内しない。
   - 代わりに **ローカルE2Eを全green** で品質担保する：`pnpm test`（vitest）を実行し、加えて反映差分に関係する `scripts/verify-*.mjs`（`verify:rls` / `verify:phase2..5`）を実行して全て green であることを確認する。
     - 今回の反映に関係する spec（apps/web の画面）は特に green を明示。1つでも fail なら停止して報告（本番反映に進まない）。
   - 残りの最終確認は **デプロイ後の本番スモーク（ハードリロード必須）**（手順8）で担保する。ここでは止まらない（自動）。

4.5 独立AIレビュー ゲート（本番反映の直前・自動）:
   - **本番に乗る差分**に対し独立レビュー（Claude非依存の Gemini・`.env` の `GEMINI_REVIEW_API_KEY`/`GEMINI_REVIEW_MODEL`）を **2〜3回 union 実行**（🔴高は `--runs 3`）：
     `node scripts/independent-review.mjs --json --runs 3 "origin/main...origin/dev"`（JSONで `verdict` / `riskClass` / `accepted` を受ける）。
     - **どれか1回でも未acceptの critical/🔴 が出たら union に残り verdict=block**（非決定性に対し保守的＝prodゲートはfalse-negativeを避ける）。
   - **verdict=block → HALT**：本番反映に進まない。findings を提示し、停止直前に LINE 通知して人間の対応（修正 or `.kody/accepted.yml` 追記）を待つ：
     `node scripts/notify-humanball.mjs --kind ship-blocked --task "<PRタイトル>" --detail "独立レビュー verdict=block（未accept🔴N件）/A.修正 B..kody/accepted.yml追記／推奨A、再実行で続行" [--url "<セッションurl>"]`
     - 人間が修正/accept追記したら、この手順から再実行。block の間は手順5以降に進まない。
   - **verdict=pass → 続行可（ただし本番反映は人間の confirm 後）**：停止直前に LINE 通知で要約提示し、明示confirmを待つ：
     `node scripts/notify-humanball.mjs --kind ship-ready --task "<PRタイトル>" --detail "独立レビュー verdict=pass / risk=<high|low> / accepted=[…]。確認後OKで本番反映へ" [--url "<セッションurl>"]`
     - **riskClass=high**（migrations/`verify_jwt`/財務系/外部anon導線 に触れる 等）の時は特に、人間が中身を確認してから confirm する旨を明示。

5. ★本番migration適用（追加のみ／本番デプロイより前・順序の罠回避）:
   - **重要：本番デプロイ（`vercel --prod`）が新フロントを公開するので、migration はそのデプロイより前に適用する**（新フロントが未適用スキーマを叩く事故を防ぐ）。追加のみDDLは後方互換なので、Merge前後どちらでも・デプロイ前に適用すればよい。
   - **追加のみDDLの場合のみ**、CCが適用してよい（破壊的を含むなら手順2で人手＋バックアップ依頼済み・ここはスキップ）：
     1. 適用承認の停止直前に LINE 通知（best-effort・失敗無視）:
        `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "本番migration適用待ち(追加のみN件)/A.「実行して」で psql 適用 B.保留／推奨A" [--url "<セッションurl>"]`
     2. 人が「実行して」等で明示承認したら、CCが `origin/main..dev` 差分の未適用 `supabase/migrations/` ファイルを **内容そのまま** 1つずつ psql で適用：
        `psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql`
        - 接続URLは `.env` の `SUPABASE_PROD_DB_URL` を使う。**値はログ/チャットに出さない**（コマンドに直接書かず環境変数参照）。db push は使わない（個別SQL適用のみ）。
        - 追加のみ（ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT 等）であることを適用直前に再確認。破壊的が混ざっていたら中止して人へ。
     3. 適用後、**本番REST**で対象の列・テーブルの存在を検証してから次へ進む（例：`https://<ref>.supabase.co/rest/v1/<table>?select=<新列>&limit=0` が200か）。異常なら停止して報告。

6. ★Merge承認ゲート（Mergeタイミング承認制・CC実行可）:
   - **Merge はコードを main に入れるだけ（自動デプロイは無し）**。本番反映は次の手順7（手動デプロイ）。とはいえ本番ブランチへの反映なので、**人が「今Mergeして」等を明示した時だけ** CC が実行する。
   - タイミング待ちで停止する直前に LINE 通知（best-effort・失敗無視）:
     `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "Mergeタイミング待ち/A.「今Mergeして」で実行 B.まだ／推奨A（<PR URL>）" [--url "<セッションurl>"]`
   - 人が「今Mergeして」等と返したら、CCが実行：`gh pr merge <PR番号> --merge`（main保護はgh認証＝人承認が前提）。Merge後 `git fetch origin main`。

7. ★本番デプロイ承認ゲート（手動デプロイ・人承認後CC実行）:
   - **本番反映＝ここ**。`main` には自動デプロイが無いため、**人が「deployして」等を明示した時だけ** CC が `vercel --prod --scope stism` を実行する（Root=`apps/web`・project `garage-connect`）。**migration（手順5）が適用済みであることを確認してから**実行する。
   - 承認待ちで停止する直前に LINE 通知（best-effort・失敗無視）:
     `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "本番デプロイ待ち/A.「deployして」で vercel --prod 実行 B.保留／推奨A（migration適用済）" [--url "<セッションurl>"]`
   - 人が明示承認したら CC が実行：`vercel --prod --scope stism`（または `cd apps/web && vercel --prod --scope stism`）。デプロイURL/結果を表示。失敗時は停止して報告（ビルドエラーは `vercel inspect <url> --logs` / `v13/deployments/{id}` の errorCode 参照）。

8. スモーク（自動・本番URL `https://garage-connect-bice.vercel.app`）: リスク別の手数（前提§）で確認し報告。
   - **必ずハードリロード**（キャッシュ無効・Cmd/Ctrl+Shift+R 相当）。Vercelデプロイ直後は旧バンドルがキャッシュされ、ハードリロードしないと反映前の画面を見て誤判定する。
   - **ベース（全リスク）**：`GET https://garage-connect-bice.vercel.app/` → 200・描画・JSエラー無し。ログイン→ダッシュボード表示。
   - **認可ガード疎通（既定・実送信ゼロで安全）**：
     - LINE webhook：`POST /api/line/webhook/<tenantId>` を署名無しで叩き **401**（署名検証が効いている）。
     - Stripe webhook：`POST /api/stripe/webhook` を署名無しで叩き **400/401**。
     - cron：`GET /api/cron/daily-notifications`（Bearer 無し）→ **401**（CRON_SECRET ガード。**実バッチ＝顧客への実配信を発火させない**）。
   - **実機能スモーク（🔴高/🧱土台かつ明示時のみ・自テナント自分宛・隔離）**：LINE通知配信を**自分のテナント＋自分のLINE宛**で1通／Stripe **テストカード**で1決済（テストモード）／LIFF予約→**自分宛**受付メッセージ。他テナント・実顧客への配信は絶対にしない。確認後 cleanup。
   - 異常があれば即停止して報告。
   - 異常なければ：対象の本番待ちタスクのNotionステータスを「完了」に更新（完了日も入れる。REST PATCH で更新し再確認）。

9. 自走再開（スモーク異常なし & 人ボール残なし & Notion完了まで終わったら）:
   - 本番反映が完了しスモーク異常が無ければ、**続けて /run のループに入り、次のdev作業を自走再開する**。
   - 異常があった場合・人ボール待ちが残る場合はここで停止して報告（/run には入らない）。

# §緊急hotfix独立ship（`hotfix/*`・main派生・dev堆積と無関係に出す）

/run 緊急レーンが作った本番待ち（📋に「緊急hotfix・ブランチ=`hotfix/<slug>`（main派生・未push）」と記載・ローカルに `hotfix/*` あり）を、**dev を経由せず独立してshipする**：
1. プリフライト（手順1）＋ migrationチェック（手順2）＋ RLS監査（手順2.5）＋ 独立AIレビュー（手順4.5。緊急でも🔴は `--runs 3`）。block/🔴LEAK は通常どおり HALT。
2. **push**：人の Merge 承認の前段として `git push origin hotfix/<slug>`。
3. **PR作成**：`gh pr create --base main --head hotfix/<slug> --title "hotfix: <要約>" --body "<緊急理由／migration有無／RLS・独立レビュー結果／スモーク観点>"`。
4. **★migration適用**（追加のみ・手順5と同じ・デプロイ前）。
5. **★Merge承認**（手順6・人の「今Mergeして」で `gh pr merge`）。
6. **★本番デプロイ承認**（手順7・人の「deployして」で `vercel --prod --scope stism`）。
7. **スモーク**（手順8・緊急は🔴相当で実機能まで・自分宛隔離）。
- 通常の本番待ち（dev上）は従来どおり dev→PR→main→deploy。緊急を先に出したい時は **その hotfix だけ** この経路で先行ship。

厳守:

- **main へ直接 push しない**。Merge は **人がタイミングを明示承認した時のみ** CCが `gh pr merge`（未指定なら待機）。
- **本番デプロイは手動 `vercel --prod --scope stism`**。**人の明示承認後にのみ** CC が実行（自動デプロイは無い＝Merge だけでは本番に出ない）。migration（追加のみ）適用後・デプロイ前の順序を守る。
- migration適用 / Merge / 本番デプロイ は必ず人の承認を取る。承認なしに実行しない。
- **migration適用は「追加のみDDL」に限る。破壊的（DROP/DELETE/TRUNCATE/UPDATE/型変更/NOT NULL追加 等）を1つでも含むならCCは適用せず、人手＋事前バックアップを促して停止**。
- **RLS監査(2.5)で🔴LEAK・独立AIレビュー(4.5)で verdict=block の間は本番反映に進まない**（HALT・`ship-blocked` 通知）。pass でも本番反映は人間の confirm 後（`ship-ready`）。kind を `ship承認` と混線させない。
- preview は使わない（自動デプロイ未配線＝preview 出ない）。品質担保はローカルE2E全green＋独立AIレビュー＋RLS監査＋本番スモーク（**ハードリロード必須**）。
- supabase db push は絶対にしない。`SUPABASE_PROD_DB_URL` の値はログ/チャットに残さない。
- **本番スモークの外部送信（LINE配信/Stripe決済）は🔴時のみ・自テナント自分宛・隔離**。通常は認可ガード疎通（401/400）で実送信ゼロ。他テナント・実顧客への配信は絶対にしない。
- **停止＝LINE通知（例外なし）**：人の入力・操作・承認待ちで止まる時は直前に必ず notify-humanball.mjs（best-effort）。「対話中だから」を理由にスキップしない。1停止で複数承認をまとめる時のみ通知1回。提示・`--detail` は **CLAUDE.md「人ボール報告フォーマット（必須）」**（結論先頭・A/B・推奨1行、LINE は1〜2行）に従う。
- スモークで異常があれば即停止して報告。
- .env はコミットしない。
