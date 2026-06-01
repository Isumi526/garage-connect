import { beforeAll, describe, expect, it } from 'vitest';

const TEST_KEY = '0'.repeat(64); // 32 バイトのテスト鍵

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe('crypto', () => {
  it('暗号化→復号で元の文字列に戻る', async () => {
    const { encrypt, decrypt } = await import('./index');
    const plain = 'LINE_CHANNEL_ACCESS_TOKEN_abcdef0123456789';
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(decrypt(enc)).toBe(plain);
  });

  it('暗号文は毎回異なる（ランダム IV）', async () => {
    const { encrypt } = await import('./index');
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('改ざんされた暗号文は復号に失敗する', async () => {
    const { encrypt, decrypt } = await import('./index');
    const enc = encrypt('secret');
    const tampered = `${enc.slice(0, -4)}AAAA`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('maskSecret は末尾4文字以外を伏せる', async () => {
    const { maskSecret } = await import('./index');
    expect(maskSecret('abcdefgh')).toMatch(/gh$/);
    expect(maskSecret('')).toBe('');
  });
});
