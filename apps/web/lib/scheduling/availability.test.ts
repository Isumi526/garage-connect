import { describe, expect, it } from 'vitest';
import { type BizHour, computeAvailability } from './availability';

// 月〜土 10:00-12:00、日曜定休（短めにしてテストしやすく）
const hours: BizHour[] = Array.from({ length: 7 }, (_, wd) => ({
  weekday: wd,
  open_time: '10:00',
  close_time: '12:00',
  is_closed: wd === 0,
}));

// 2026-06-01 は月曜。現在を前日にして全枠を未来扱いにする。
const NOW = new Date('2026-05-31T00:00:00+09:00').getTime();

describe('computeAvailability', () => {
  it('30分枠で 10:00,10:30,11:00,11:30 が出る（12:00手前まで）', () => {
    const r = computeAvailability({
      hours,
      closures: [],
      bookings: [],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: NOW,
    });
    expect(r[0]?.date).toBe('2026-06-01');
    expect(r[0]?.slots).toEqual(['10:00', '10:30', '11:00', '11:30']);
  });

  it('定休日(日曜)は結果に含まれない', () => {
    const r = computeAvailability({
      hours,
      closures: [],
      bookings: [],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-07', // 日曜
      days: 1,
      nowMs: NOW,
    });
    expect(r).toHaveLength(0);
  });

  it('定員1で予約済みの枠は消える', () => {
    const r = computeAvailability({
      hours,
      closures: [],
      bookings: [{ preferred_date: '2026-06-01', preferred_time_slot: '10:30' }],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: NOW,
    });
    expect(r[0]?.slots).toEqual(['10:00', '11:00', '11:30']);
  });

  it('定員2なら1件予約でも枠は残る', () => {
    const r = computeAvailability({
      hours,
      closures: [],
      bookings: [{ preferred_date: '2026-06-01', preferred_time_slot: '10:30' }],
      slotMinutes: 30,
      slotCapacity: 2,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: NOW,
    });
    expect(r[0]?.slots).toContain('10:30');
  });

  it('臨時休業(10:00-11:00)と重なる枠は消える', () => {
    const r = computeAvailability({
      hours,
      closures: [{ start_at: '2026-06-01T10:00:00+09:00', end_at: '2026-06-01T11:00:00+09:00' }],
      bookings: [],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: NOW,
    });
    expect(r[0]?.slots).toEqual(['11:00', '11:30']);
  });

  it('終日休業(00:00-23:59)はその日が消える', () => {
    const r = computeAvailability({
      hours,
      closures: [{ start_at: '2026-06-01T00:00:00+09:00', end_at: '2026-06-01T23:59:59+09:00' }],
      bookings: [],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: NOW,
    });
    expect(r).toHaveLength(0);
  });

  it('過去の枠は除外される', () => {
    // 現在を 2026-06-01 10:45 JST にすると 10:00/10:30 は過去
    const now = new Date('2026-06-01T10:45:00+09:00').getTime();
    const r = computeAvailability({
      hours,
      closures: [],
      bookings: [],
      slotMinutes: 30,
      slotCapacity: 1,
      fromDate: '2026-06-01',
      days: 1,
      nowMs: now,
    });
    expect(r[0]?.slots).toEqual(['11:00', '11:30']);
  });
});
