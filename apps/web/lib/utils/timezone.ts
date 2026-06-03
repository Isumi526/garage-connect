/**
 * タイムゾーンは JST(Asia/Tokyo) で統一する。
 * 予約日時・配信時刻は UTC ズレを避けるため、原則「日付のみ(YYYY-MM-DD)」を
 * 文字列で扱い、Date.toISOString() による UTC 変換を行わない。
 */
const JST = 'Asia/Tokyo';

/** 今日の日付を JST の YYYY-MM-DD で返す（sv-SE ロケール = ISO 形式） */
export function todayJst(base: Date = new Date()): string {
  return base.toLocaleDateString('sv-SE', { timeZone: JST });
}

/** base から days 日後の JST 日付(YYYY-MM-DD) */
export function jstDatePlus(days: number, base: Date = new Date()): string {
  return new Date(base.getTime() + days * 86400000).toLocaleDateString('sv-SE', { timeZone: JST });
}

/** YYYY-MM-DD を「2026年7月1日(火)」形式（JST）で表示 */
export function formatJstDate(dateStr: string): string {
  // dateStr は日付のみ。正午 UTC として解釈し JST 表示しても日付は不変。
  const d = new Date(`${dateStr}T12:00:00+09:00`);
  return d.toLocaleDateString('ja-JP', {
    timeZone: JST,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** 予約の時間帯スロット（JST 前提の固定選択肢） */
export const TIME_SLOTS = [
  { value: 'morning', label: '午前（9:00〜12:00）' },
  { value: 'afternoon', label: '午後（13:00〜17:00）' },
  { value: 'anytime', label: '指定なし' },
] as const;

export function timeSlotLabel(value: string | null): string {
  if (!value) return '指定なし';
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}〜`; // 新形式: 予約枠の開始時刻
  return TIME_SLOTS.find((s) => s.value === value)?.label ?? value; // 旧形式の互換
}
