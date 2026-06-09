#!/usr/bin/env node
/**
 * バックログDBから「要件定義済み」のタスクを、案件(プロジェクト)で絞って優先度順に全件取得する。
 * 複数プロジェクトを同一Notionバックログで運用するため、案件 relation で自プロジェクト分のみに絞る。
 *
 * 必要な環境変数（.env）:
 *   NOTION_TOKEN        … Notion インテグレーショントークン
 *   BACKLOG_DB_ID       … バックログDBの ID
 *   BACKLOG_PROJECT_ID  … このプロジェクトの案件ページID（絞り込みキー）
 *
 * 出力: 盤面（要件定義済み一覧）＋ 末尾に NEXT_TARGET_URL=<最優先タスクのURL>
 * 実行: node --env-file=.env scripts/next-target.mjs
 */

const TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.BACKLOG_DB_ID;
const PROJECT_ID = process.env.BACKLOG_PROJECT_ID;
const NOTION_VERSION = '2022-06-28';

const PRIORITY_ORDER = { 緊急: 0, 高: 1, 中: 2, 低: 3 };

if (!TOKEN || !DB_ID) {
  console.error('NOTION_TOKEN / BACKLOG_DB_ID が未設定です（.env を確認）。');
  process.exit(1);
}

async function notion(path, init = {}) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json();
  if (json.object === 'error') throw new Error(`${json.code}: ${json.message}`);
  return json;
}

async function main() {
  // DB スキーマからプロパティ名を解決（名称ゆれに強くする）
  const db = await notion(`databases/${DB_ID}`);
  const props = db.properties ?? {};
  const byType = (t) => Object.entries(props).find(([, v]) => v.type === t)?.[0];
  const statusProp = byType('status') ?? 'ステータス';
  const titleProp = byType('title') ?? 'タスク名';
  const priorityProp =
    Object.keys(props).find((k) => /優先/.test(k)) ?? byType('select') ?? '優先順位';
  // 案件(プロジェクト)を表す relation プロパティ
  const projectProp = byType('relation');

  // フィルタ: ステータス=要件定義済み（＋案件 relation があれば自案件で絞る）
  const and = [{ property: statusProp, status: { equals: '要件定義済み' } }];
  if (projectProp && PROJECT_ID) {
    and.push({ property: projectProp, relation: { contains: PROJECT_ID } });
  }

  const tasks = [];
  let cursor;
  do {
    const body = { filter: { and }, page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notion(`databases/${DB_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    tasks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // 並び替え: 優先順位（緊急>高>中>低）→ 作成日 古い順
  tasks.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.properties?.[priorityProp]?.select?.name] ?? 99;
    const pb = PRIORITY_ORDER[b.properties?.[priorityProp]?.select?.name] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.created_time) - new Date(b.created_time);
  });

  const title = (t) => t.properties?.[titleProp]?.title?.[0]?.plain_text ?? '(無題)';
  const prio = (t) => t.properties?.[priorityProp]?.select?.name ?? '-';

  if (!projectProp) {
    console.log(
      '⚠️ バックログDBに案件(relation)プロパティが見つかりません。複数プロジェクト共用の絞り込みができないため、',
    );
    console.log(
      '   このプロジェクトのタスクのみを安全に抽出できません。Notion側で案件 relation を追加し、',
    );
    console.log('   各タスクを当プロジェクトの案件ページに紐付けてください。');
    console.log('NEXT_TARGET_URL=');
    return;
  }

  console.log(`=== 要件定義済み（案件で絞り込み）: ${tasks.length} 件 ===`);
  for (const t of tasks) {
    console.log(`- [${prio(t)}] ${title(t)}  ${t.url}`);
  }
  console.log('');
  console.log(`NEXT_TARGET_URL=${tasks[0]?.url ?? ''}`);
}

main().catch((e) => {
  console.error('next-target エラー:', e.message);
  process.exit(1);
});
