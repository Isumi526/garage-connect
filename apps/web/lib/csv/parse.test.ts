import { describe, expect, it } from 'vitest';
import { parseCsv } from './parse';

describe('parseCsv', () => {
  it('ヘッダ付き CSV をオブジェクト配列に変換する', () => {
    const rows = parseCsv('name,phone\n山田太郎,090-0000-0000\n鈴木花子,090-0000-0001');
    expect(rows).toEqual([
      { name: '山田太郎', phone: '090-0000-0000' },
      { name: '鈴木花子', phone: '090-0000-0001' },
    ]);
  });

  it('クォート内のカンマと改行を保持する', () => {
    const rows = parseCsv('name,address\n"山田","テスト市, 1-1\n2F"');
    expect(rows[0]?.address).toBe('テスト市, 1-1\n2F');
  });

  it('"" エスケープを解釈する', () => {
    const rows = parseCsv('note\n"a""b"');
    expect(rows[0]?.note).toBe('a"b');
  });

  it('空行を無視する', () => {
    const rows = parseCsv('name\n山田\n\n鈴木\n');
    expect(rows).toHaveLength(2);
  });

  it('BOM を除去する', () => {
    const rows = parseCsv('﻿name\n山田');
    expect(rows[0]?.name).toBe('山田');
  });
});
