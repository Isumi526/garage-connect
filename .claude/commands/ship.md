
garage-connect の本番反映を、各本番操作の承認を取りながら進めるエージェント。

本番反映は **PR経由**。Merge は **人がタイミングを明示承認した時のみ** CCが `gh pr merge` で実行する（＝本番承認ゲート）。
CC は PR作成・承認後の migration適用 / Merge / functions deploy / スモークを行う（各操作ごとに人の承認）。
品質担保は **ローカルE2E全green＋Merge後の本番スモーク（ハードリロード必須）**（dev は Vercel preview 無効のため preview URL は使わない／案内しない）。

バックログDB: https://www.notion.so/6e7dd24739dd431688564b12f64d8ebd?v=3760ff81c56b8185a056000cd43639bb&source=copy_link

> 通知: `notify-humanball.mjs` は task 名に自動で **[Garage]** を付与する（複数プロジェクト共用 LINE チャンネルでの判別用）。
>
> **承認待ちの提示（画面）と `--detail`（LINE）は CLAUDE.md「人ボール報告フォーマット（必須）」に従う**：結論先頭・選択肢 A/B・推奨1行。LINE は `何の承認か＋A.承認(合図) B.保留／推奨X` を **1〜2行**に圧縮する。

# 前提

- main = 本番(Vercel自動デプロイ)、dev = 同期用。本番Supabase ref = ezgktyhxnoimczbhokkv。
- 本番反映は dev → PR → main。**CCは main へ直接 push しない**。Merge は人がタイミングを明示承認した時だけ CCが `gh pr merge` で行う（main保護＝gh認証経由・人承認前提）。
- dev は Vercel preview 無効（`vercel.json` の `git.deploymentEnabled.dev=false`）→ 有効な preview URL は出ない。品質担保は **ローカルE2E全green＋本番スモーク**。
- supabase db push は絶対禁止。DB変更は正式なmigration（追加のみ・後方互換）でのみ。
- **本番migration適用は、人の明示承認＋追加のみDDLに限りCCが psql で実行可**（`.env` の `SUPABASE_PROD_DB_URL`。値はログ/チャットに残さない）。破壊的を1つでも含むなら人手のSQLエディタ実行＋事前バックアップ（CCは実行しない）。適用は **Merge＝Vercel本番デプロイより前** に行う。

# 手順

1. プリフライト（読み取りのみ・自動／git状態・dev最新化）:
   - git log --oneline main..dev で「本番に乗る差分」を一覧化。
   - 差分に DB migration / API route handlers(webhook/cron)変更 / 破壊的変更 が含まれるか分類して提示。
   - 本番待ちのNotionタスクを一覧化し、今回どれが反映されるか対応づけ。
   - 後方互換か・ロールバック可能かのリスク要約を出す。
   - dev を最新化： `git switch dev && git push origin dev`。

2. migrationチェック（事前検知①・読み取りのみ・自動）:
   - 今回 dev→main で入る差分に DB migration が含まれるか機械的に確認：
     `git diff --name-only origin/main...dev` で `supabase/migrations/` 配下の
     新規/変更ファイルを列挙する。
   - **該当あり**：後続のPR本文に「## ⚠️ migration あり」セクションを作り、
     ファイル名・概要・後方互換性（追加のみか／破壊的か）・本番適用要否を明記する。
     - **「追加のみ」か「破壊的を含む」かを機械的に判定して人に提示**する：
       - 追加のみ＝ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT 等の非破壊DDLのみ。
       - 破壊的＝DROP / DELETE / TRUNCATE / UPDATE / カラム型変更（ALTER ... TYPE）/ NOT NULL追加 等、既存データを失う・壊す可能性が1つでもある。
     - **追加のみ** → 手順5で人の承認後にCCが psql で適用できる（後述）。
     - **破壊的を含む** → CCは適用しない。本番DBのバックアップ取得済みかを確認（★）し、未取得なら促して停止。人手のSQLエディタ実行＋事前バックアップを依頼する。
       - **停止する直前に LINE 通知（best-effort・失敗無視）**：
         `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "破壊的migrationN件あり/A.バックアップ後SQLエディタで手動実行 B.中止／推奨A（CCは適用しない）" [--url "<セッションurl>"]`
   - **該当なし**：後続のPR本文に「migration: なし」と明記する。
   - これにより「migration適用漏れ」を Merge 前に人が必ず認識できる状態にする。

3. PR作成（CCが自動）:
   - PR作成（本文に **migration有無**＝手順2の結果を必ず含める）：
     ```
     gh pr create --base main --head dev \
       --title "release: <本番反映する内容の要約>" \
       --body "<反映タスク一覧（Notion）／migration有無（あり=⚠️セクション/なし=明記）／後方互換性／スモーク観点>"
     ```
   - 作成後、PRのURLを表示する。

4. 品質担保（ローカルE2E全green・自動／preview は使わない）:
   - dev は Vercel preview 無効で **有効な preview URL は出ない** → preview 確認はしない・案内しない。
   - 代わりに **ローカルE2Eを全green** で品質担保する：`pnpm test` を実行し、
     `apps/web/**/*.test.ts`（vitest）と `scripts/verify-*.mjs` が全て green であることを確認する。
     - 今回の反映に関係する spec（apps/web の画面）は特に green を明示。1つでも fail なら停止して報告（本番反映に進まない）。
   - 残りの最終確認は **Merge後の本番スモーク（ハードリロード必須）**（手順8）で担保する。ここでは止まらない（自動）。

5. ★本番migration適用（追加のみ／Mergeより前・順序の罠回避）:
   - **重要：Merge＝Vercel本番デプロイ自動実行なので、migration は Merge より前に適用する**（新フロントが未適用スキーマを叩く事故を防ぐ）。
   - **追加のみDDLの場合のみ**、CCが適用してよい（破壊的を含むなら手順2で人手＋バックアップ依頼済み・ここはスキップ）：
     1. 適用承認の停止直前に LINE 通知（best-effort・失敗無視）:
        `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "本番migration適用待ち(追加のみN件)/A.「実行して」で psql 適用 B.保留／推奨A" [--url "<セッションurl>"]`
     2. 人が「実行して」等で明示承認したら、CCが `origin/main..dev` 差分の未適用 `supabase/migrations/` ファイルを **内容そのまま** 1つずつ psql で適用：
        `psql "$SUPABASE_PROD_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql`
        - 接続URLは `.env` の `SUPABASE_PROD_DB_URL` を使う。**値はログ/チャットに出さない**（コマンドに直接書かず環境変数参照）。db push は使わない（個別SQL適用のみ）。
        - 追加のみ（ADD COLUMN / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT 等）であることを適用直前に再確認。破壊的が混ざっていたら中止して人へ。
     3. 適用後、**本番REST**で対象の列・テーブルの存在を検証してから次へ進む（例：`?select=<新列>&limit=0` が200か）。異常なら停止して報告。

6. ★本番承認ゲート（Mergeタイミング承認制・CC実行可）:
   - **Merge＝Vercel本番デプロイ自動実行**。本番影響が出るので、**人が「今Mergeして」等、本番を確認できるタイミングを明示した時だけ** CCが実行する。
   - タイミング待ちで停止する直前に LINE 通知（best-effort・失敗無視）:
     `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "Mergeタイミング待ち/A.本番を見れる時に「今Mergeして」 B.まだ／推奨A（<PR URL>）" [--url "<セッションurl>"]`
   - 人がタイミングを明示しない限り **CCはMergeせず待機**（勝手にMergeしない）。
   - 人が「今Mergeして」等と返したら、CCが実行：`gh pr merge <PR番号> --merge`（main保護はgh認証＝人承認が前提）。

7. Merge完了後、main最新を取り込み（`git fetch origin main`）、残りの本番操作（各★承認）:
   - **各★承認で停止する直前に LINE 通知（best-effort・失敗無視）**。同じ停止で複数承認をまとめて聞く場合は通知も1回にまとめる（連投しない）。
   - webhook/cron 等は Next.js の API route handlers（apps/web）で、**Merge＝Vercel本番デプロイで一緒に反映される**（Supabase edge functions の個別 deploy は使っていない）。別途 deploy/設定変更が要る場合のみ ★承認 → 反映。停止直前に：
     `node scripts/notify-humanball.mjs --kind ship承認 --task "<PRタイトル>" --detail "<deploy/設定内容>承認待ち/A.「実行して」で反映 B.保留／推奨A" [--url "<セッションurl>"]`

8. スモーク（自動・本番URL）: テストアカウントで、今回の反映に関係する主要動線（ログイン→ダッシュボード／車検通知の配信・配信ログ／LIFF予約／Stripe決済 など）を確認し報告。
   - **必ずハードリロード**（キャッシュ無効・Cmd/Ctrl+Shift+R 相当）で確認する。Vercelデプロイ直後は旧バンドルがキャッシュされ、ハードリロードしないと反映前の画面を見て誤判定する。
   - 異常があれば即停止して報告。
   - 異常なければ：対象の本番待ちタスクのNotionステータスを「完了」に更新（完了日も入れる）。

9. 自走再開（スモーク異常なし & 人ボール残なし & Notion完了まで終わったら）:
   - 本番反映が完了しスモーク異常が無ければ、**続けて /run のループに入り、次のdev作業を自走再開する**。
   - 異常があった場合・人ボール待ちが残る場合はここで停止して報告（/run には入らない）。

厳守:

- **main へ直接 push しない**。Merge は **人がタイミングを明示承認した時のみ** CCが `gh pr merge` で実行（タイミング未指定なら待機）。
- migration適用 / Merge / functions deploy は必ず人の承認を取る。承認なしに実行しない。
- **migration適用は「追加のみDDL」に限る。破壊的（DROP/DELETE/TRUNCATE/UPDATE/型変更/NOT NULL追加 等）を1つでも含むならCCは適用せず、人手＋事前バックアップを促して停止**。
- migration適用は Merge（＝Vercel本番デプロイ）より前に行う。
- preview は使わない（dev preview 無効）。品質担保はローカルE2E全green＋本番スモーク（**ハードリロード必須**）。
- supabase db push は絶対にしない。`SUPABASE_PROD_DB_URL` の値はログ/チャットに残さない。
- **停止＝LINE通知（例外なし）**：人の入力・操作・承認待ちで止まる時は直前に必ず notify-humanball.mjs（best-effort）。「対話中だから」を理由にスキップしない（見られているか判断できないため常に通知）。1停止で複数承認をまとめる時のみ通知1回。提示・`--detail` は **CLAUDE.md「人ボール報告フォーマット（必須）」**（結論先頭・A/B・推奨1行、LINE は1〜2行）に従う。
- スモークで異常があれば即停止して報告。
- .env はコミットしない。
