import crypto from 'node:crypto';

/**
 * LINE Webhook の署名検証。
 * x-line-signature = base64( HMAC-SHA256(channelSecret, requestBodyRaw) )
 * タイミング攻撃を避けるため timingSafeEqual で比較する。
 */
export function validateSignature(
  body: string,
  channelSecret: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
