/**
 * カレンダー用の日付ユーティリティ。
 * サーバーが UTC(Vercel) でも狂わないよう、暦日は UTC 基準の純粋計算で扱い、
 * 「今日(JST)」だけ Asia/Tokyo ロケールで取得する。
 */
const pad = (n: number) => String(n).padStart(2, '0');

export type YearMonth = { year: number; month: number }; // month: 1-12

/** 'YYYY-MM' をパース。未指定/不正なら今日(JST)の年月。 */
export function parseMonth(param: string | undefined | null): YearMonth {
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const todayJst = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const [y, mo] = todayJst.split('-');
  return { year: Number(y), month: Number(mo) };
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${year}年${month}月`;
}

export function addMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function ym({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

/** 月初・月末(YYYY-MM-DD) */
export function monthRange({ year, month }: YearMonth): { start: string; end: string } {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(days)}` };
}

/**
 * 日曜始まりの週マトリクス。各セルは 'YYYY-MM-DD' か null(余白)。
 */
export function monthMatrix({ year, month }: YearMonth): (string | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=日
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** ISO 文字列 → JST の 'YYYY-MM-DD' */
export function jstDateOf(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/** ISO 文字列 → JST の 'HH:MM' */
export function jstTimeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 'YYYY-MM-DD' の a..b（両端含む）の日付配列。範囲が広すぎる場合は 60 日で打ち切り。 */
export function datesBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  for (let t = start, i = 0; t <= end && i < 60; t += 86400000, i++) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** 今日(JST)の 'YYYY-MM-DD' */
export function todayJstDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
