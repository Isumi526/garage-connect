/**
 * 最小限の CSV パーサ（RFC 4180 準拠の範囲）。
 * - ダブルクォートで囲まれたフィールド内のカンマ・改行・"" エスケープに対応
 * - 先頭行をヘッダとして key→value のオブジェクト配列を返す
 * 外部依存を増やさないため自前実装。
 */
export function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^﻿/, ''); // BOM 除去
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // 最終フィールド/行
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0]?.map((h) => h.trim()) ?? [];
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    header.forEach((key, idx) => {
      obj[key] = (cols[idx] ?? '').trim();
    });
    return obj;
  });
}
