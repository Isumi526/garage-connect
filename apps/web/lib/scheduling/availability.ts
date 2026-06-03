/**
 * 予約可能枠の算出（純関数・JST基準）。
 * 営業時間 −(定休日・臨時休業) −(過去) −(定員に達した枠) = 空き枠。
 */
const pad = (n: number) => String(n).padStart(2, '0');

export interface BizHour {
  weekday: number; // 0=日..6=土
  open_time: string; // 'HH:MM' or 'HH:MM:SS'
  close_time: string;
  is_closed: boolean;
}
export interface ClosureInterval {
  start_at: string; // ISO
  end_at: string; // ISO
}
export interface ExistingBooking {
  preferred_date: string; // YYYY-MM-DD
  preferred_time_slot: string | null; // 'HH:MM' を想定（旧データは無視）
}
export interface DayAvailability {
  date: string; // YYYY-MM-DD
  slots: string[]; // ['10:00','10:30',...]
}

function toMin(t: string): number {
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
}
function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
function addDaysIso(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86400000)
    .toISOString()
    .slice(0, 10);
}

export function computeAvailability(params: {
  hours: BizHour[];
  closures: ClosureInterval[];
  bookings: ExistingBooking[];
  slotMinutes: number;
  slotCapacity: number;
  fromDate: string; // YYYY-MM-DD (JST)
  days: number;
  nowMs: number; // 現在時刻(ms)
}): DayAvailability[] {
  const { hours, closures, bookings, slotMinutes, slotCapacity, fromDate, days, nowMs } = params;

  const hourByWd = new Map(hours.map((h) => [h.weekday, h]));
  const closureIntervals = closures.map((c) => ({
    start: new Date(c.start_at).getTime(),
    end: new Date(c.end_at).getTime(),
  }));

  // 予約数カウント: `${date} ${HH:MM}` → 件数（HH:MM 形式のみ集計）
  const bookingCount = new Map<string, number>();
  for (const b of bookings) {
    if (b.preferred_time_slot && /^\d{2}:\d{2}$/.test(b.preferred_time_slot)) {
      const key = `${b.preferred_date} ${b.preferred_time_slot}`;
      bookingCount.set(key, (bookingCount.get(key) ?? 0) + 1);
    }
  }

  const result: DayAvailability[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDaysIso(fromDate, i);
    const wd = weekdayOf(date);
    const h = hourByWd.get(wd);
    if (!h || h.is_closed) continue;

    const openMin = toMin(h.open_time);
    const closeMin = toMin(h.close_time);
    const slots: string[] = [];

    for (let min = openMin; min + slotMinutes <= closeMin; min += slotMinutes) {
      const hh = pad(Math.floor(min / 60));
      const mm = pad(min % 60);
      const slotStart = new Date(`${date}T${hh}:${mm}:00+09:00`).getTime();
      const slotEnd = slotStart + slotMinutes * 60000;

      if (slotStart <= nowMs) continue; // 過去枠
      if (closureIntervals.some((c) => slotStart < c.end && slotEnd > c.start)) continue; // 休業と重複
      if ((bookingCount.get(`${date} ${hh}:${mm}`) ?? 0) >= slotCapacity) continue; // 満枠

      slots.push(`${hh}:${mm}`);
    }

    if (slots.length > 0) result.push({ date, slots });
  }

  return result;
}
