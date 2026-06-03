import { describe, expect, it } from 'vitest';
import { addMonth, datesBetween, monthMatrix, monthRange, parseMonth } from './calendar';

describe('calendar utils', () => {
  it('parseMonth: 正常な YYYY-MM', () => {
    expect(parseMonth('2026-06')).toEqual({ year: 2026, month: 6 });
  });

  it('addMonth: 年またぎ', () => {
    expect(addMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('monthRange: 月末日が正しい（2月）', () => {
    expect(monthRange({ year: 2026, month: 2 })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('monthMatrix: 2026-06 は 1日が月曜、全日付を含む', () => {
    const weeks = monthMatrix({ year: 2026, month: 6 });
    // 2026-06-01 は月曜(weekday=1) → 先頭セルは null(日), 2番目に 06-01
    expect(weeks[0]?.[0]).toBeNull();
    expect(weeks[0]?.[1]).toBe('2026-06-01');
    const flat = weeks.flat().filter(Boolean);
    expect(flat).toHaveLength(30);
    expect(flat.at(-1)).toBe('2026-06-30');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('datesBetween: 両端含む', () => {
    expect(datesBetween('2026-06-01', '2026-06-03')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });
});
