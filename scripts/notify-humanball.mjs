// ============================================================
//  scripts/notify-humanball.mjs
//  人ボール（要回答/要対応/ship承認）が発生したとき、本人に LINE 通知を送る。
//  - これは「本人への個人通知」であり、外部一斉送信ではない（許可）。
//  - best-effort：失敗しても自走は止めない（必ず exit 0）。
//  - HUMANBALL_WEBHOOK_URL が未設定なら何もせず終了。
//
//  ※複数プロジェクトが同一 LINE チャンネルに来るため、task 名の頭に [Garage] を必ず付ける。
//  ※認証は GAS Webhook の仕様に合わせ、secret を JSON ボディに入れる（HMAC ヘッダではない）。
//    GAS は HTTP 200 でも本文 {"ok":false,"error":"unauthorized"} を返すことがあるので、
//    本文の ok も見て成否を判定する（HTTP ステータスだけでは誤判定する）。
//
//  使い方:
//    node scripts/notify-humanball.mjs \
//      --kind 要回答 --task "<タスク名>" --detail "<質問+案や理由>" [--url "<セッションurl>"]
//  必要env(.env): HUMANBALL_WEBHOOK_URL, HUMANBALL_WEBHOOK_SECRET
// ============================================================
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PREFIX = '[Garage]';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(p) {
  const out = {};
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* ignore */
  }
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const env = loadEnv(resolve(ROOT, '.env'));
const URL = process.env.HUMANBALL_WEBHOOK_URL || env.HUMANBALL_WEBHOOK_URL;
const SECRET = process.env.HUMANBALL_WEBHOOK_SECRET || env.HUMANBALL_WEBHOOK_SECRET;

if (!URL) {
  console.warn('HUMANBALL_WEBHOOK_URL 未設定のため通知スキップ（best-effort）');
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const rawTask = typeof args.task === 'string' ? args.task : '(無題)';
const task = rawTask.startsWith(PREFIX) ? rawTask : `${PREFIX} ${rawTask}`;
// --url 未指定なら Claude Code Remote Control の固定入口を既定にする（個別セッションURLは毎回変わり取得できないため）。
const url = typeof args.url === 'string' ? args.url : 'https://claude.ai/code';
// 認証は secret を JSON ボディに入れる（sido の GAS Webhook と同じ契約）。HMAC ヘッダではない。
// project は GAS 側のプロジェクト名ラベル出し分け用（無いと "sido" 表示になる）。
const payload = {
  project: 'garage-connect',
  secret: SECRET || '',
  kind: typeof args.kind === 'string' ? args.kind : '通知',
  task,
  detail: typeof args.detail === 'string' ? args.detail : '',
  url,
};

try {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let ok = res.ok;
  try {
    const j = JSON.parse(text);
    if (j && typeof j.ok === 'boolean') ok = j.ok; // GAS 本文の ok を優先（200でも ok:false がある）
  } catch {
    /* 非JSON応答は HTTP ステータスで判断 */
  }
  if (ok) {
    console.log(`✓ humanball通知を送信 (${payload.kind}: ${task})`);
  } else {
    console.error(
      `! humanball通知に失敗 (HTTP ${res.status}): ${text.slice(0, 200)}。自走は継続します。`,
    );
  }
} catch (e) {
  console.error(`! humanball通知に失敗 (${e?.message || e})。自走は継続します。`);
}

// 通知は best-effort。何があっても自走を止めない。
process.exit(0);
