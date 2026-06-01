import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyTemplate } from './messages';
import { validateSignature } from './signature';

describe('validateSignature', () => {
  const secret = 'channel-secret-xyz';
  const body = '{"events":[]}';
  const sign = (b: string, s: string) => crypto.createHmac('SHA256', s).update(b).digest('base64');

  it('正しい署名を受理する', () => {
    expect(validateSignature(body, secret, sign(body, secret))).toBe(true);
  });

  it('誤った署名を拒否する', () => {
    expect(validateSignature(body, secret, sign(body, 'wrong'))).toBe(false);
  });

  it('署名なしを拒否する', () => {
    expect(validateSignature(body, secret, null)).toBe(false);
  });

  it('改ざんされた本文を拒否する', () => {
    expect(validateSignature('{"events":[1]}', secret, sign(body, secret))).toBe(false);
  });
});

describe('applyTemplate', () => {
  it('{{var}} を値で置換する', () => {
    const out = applyTemplate('{{customer_name}} 様、{{vehicle_name}} の車検は {{expiry_date}}', {
      customer_name: '山田太郎',
      vehicle_name: 'フィット',
      expiry_date: '2026年7月1日',
    });
    expect(out).toBe('山田太郎 様、フィット の車検は 2026年7月1日');
  });

  it('空白入りの {{ var }} も置換する', () => {
    expect(applyTemplate('{{ shop_name }}', { shop_name: 'テスト整備' })).toBe('テスト整備');
  });

  it('未定義の変数は空文字になる', () => {
    expect(applyTemplate('a{{missing}}b', {})).toBe('ab');
  });

  it('null/undefined は空文字になる', () => {
    expect(applyTemplate('{{a}}{{b}}', { a: null, b: undefined })).toBe('');
  });
});
