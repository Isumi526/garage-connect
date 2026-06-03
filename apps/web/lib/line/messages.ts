/**
 * 通知メッセージの組み立て。
 * テンプレ本文中の {{variable}} を値で置換する。
 */

export type TemplateVariables = Record<string, string | null | undefined>;

/** 既知の変数（テンプレ編集 UI の補助にも使う） */
export const TEMPLATE_VARIABLES = [
  { key: 'customer_name', label: '顧客名' },
  { key: 'vehicle_name', label: '車名' },
  { key: 'vehicle_number', label: '車両番号' },
  { key: 'expiry_date', label: '満了日' },
  { key: 'shop_name', label: '店舗名' },
  { key: 'booking_url', label: '予約URL' },
] as const;

/** {{key}} を vars[key] で置換する。未定義の変数は空文字に。 */
export function applyTemplate(body: string, vars: TemplateVariables): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

/** LINE のテキストメッセージ JSON を作る */
export function textMessage(text: string) {
  return { type: 'text' as const, text };
}

/** 予約受付（確認待ち）メッセージ */
export function bookingReceivedText(p: {
  shopName: string;
  bookingTypeLabel: string;
  dateLabel: string;
  slotLabel: string;
}): string {
  return [
    `${p.shopName} です。`,
    `${p.bookingTypeLabel}のご予約を受け付けました。`,
    '',
    `希望日: ${p.dateLabel}`,
    `時間帯: ${p.slotLabel}`,
    '',
    '内容を確認のうえ、確定のご連絡をいたします。',
  ].join('\n');
}

/** 予約確定メッセージ */
export function bookingConfirmedText(p: {
  shopName: string;
  bookingTypeLabel: string;
  dateLabel: string;
  slotLabel: string;
}): string {
  return [
    `${p.shopName} です。`,
    `${p.bookingTypeLabel}のご予約が確定しました。`,
    '',
    `日時: ${p.dateLabel} ${p.slotLabel}`,
    '',
    'ご来店をお待ちしております。',
  ].join('\n');
}
