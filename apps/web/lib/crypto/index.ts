import crypto from 'node:crypto';

/**
 * 機密文字列（LINE Channel Token 等）の暗号化ヘルパー。
 * AES-256-GCM。出力は base64(iv[12] + authTag[16] + ciphertext)。
 * 鍵は環境変数 ENCRYPTION_KEY（32 バイト = 64 桁 hex）。
 * 鍵はモジュール読込時ではなく利用時に検証する（ビルド時の未設定で落とさない）。
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('ENCRYPTION_KEY が未設定、または 32 バイト(64 桁 hex) ではありません');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const buf = Buffer.from(encryptedBase64, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/** マスク表示用：末尾 4 文字以外を伏せる */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(value.length - 4, 12))}${value.slice(-4)}`;
}
