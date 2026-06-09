#!/usr/bin/env node
/**
 * 人ボール（停止・要対応・要回答・ship承認 等）を LINE に通知する best-effort スクリプト。
 * 複数プロジェクトが同じ通知チャンネルに来るため、task 名の頭に [Garage] を必ず付け、
 * どのプロジェクトの人ボールか判別できるようにする。
 *
 * 必要な環境変数（.env）:
 *   HUMANBALL_WEBHOOK_URL    … 通知Webhookの URL
 *   HUMANBALL_WEBHOOK_SECRET … 署名用シークレット（HMAC-SHA256）
 *
 * 使い方:
 *   node --env-file=.env scripts/notify-humanball.mjs \
 *     --kind 要対応 --task "<タスク名>" --detail "<詳細>" [--url "<セッションURL>"]
 *
 * best-effort: 失敗しても呼び出し元を止めない（exit 0）。
 */
import { createHmac } from 'node:crypto';

const PROJECT = 'garage-connect';
const PREFIX = '[Garage]';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.HUMANBALL_WEBHOOK_URL;
  const secret = process.env.HUMANBALL_WEBHOOK_SECRET;
  if (!url) {
    console.warn('HUMANBALL_WEBHOOK_URL 未設定のため通知スキップ（best-effort）');
    return;
  }

  const rawTask = arg('task') ?? '(無題)';
  const task = rawTask.startsWith(PREFIX) ? rawTask : `${PREFIX} ${rawTask}`;
  const payload = {
    project: PROJECT,
    kind: arg('kind') ?? '通知',
    task,
    detail: arg('detail') ?? '',
    url: arg('url') ?? '',
    ts: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);

  const headers = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['X-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) {
      console.warn(`通知失敗 (${res.status}): ${(await res.text()).slice(0, 200)}（best-effort）`);
    } else {
      console.log(`通知送信: ${payload.kind} / ${task}`);
    }
  } catch (e) {
    console.warn(`通知例外: ${e instanceof Error ? e.message : String(e)}（best-effort）`);
  }
}

// 通知の失敗で呼び出し元を止めない
main().finally(() => process.exit(0));
