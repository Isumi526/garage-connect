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
