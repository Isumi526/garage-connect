import { z } from 'zod';
import { optionalString } from './helpers';

export const eventTypes = ['closure', 'open', 'other'] as const;

export const EVENT_TYPE_LABEL: Record<string, string> = {
  closure: '休業',
  open: '臨時営業',
  other: '用事',
};

export const scheduleEventInputSchema = z
  .object({
    event_type: z.enum(eventTypes).default('other'),
    title: optionalString,
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付を選択してください'),
    end_date: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
    all_day: z.boolean().default(false),
    start_time: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    ),
    end_time: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    ),
    notes: optionalString,
  })
  .refine((d) => d.all_day || (d.start_time && d.end_time), {
    message: '時刻指定の予定は開始・終了時刻を入力してください',
    path: ['start_time'],
  })
  .refine((d) => d.all_day || !d.start_time || !d.end_time || d.start_time < d.end_time, {
    message: '開始時刻は終了時刻より前にしてください',
    path: ['end_time'],
  });

export type ScheduleEventInput = z.infer<typeof scheduleEventInputSchema>;

/** フォーム入力 → start_at/end_at(ISO, JST基準) に変換 */
export function toEventTimestamps(d: ScheduleEventInput): { start_at: string; end_at: string } {
  if (d.all_day) {
    const end = d.end_date && d.end_date >= d.start_date ? d.end_date : d.start_date;
    return {
      start_at: `${d.start_date}T00:00:00+09:00`,
      end_at: `${end}T23:59:59+09:00`,
    };
  }
  return {
    start_at: `${d.start_date}T${d.start_time}:00+09:00`,
    end_at: `${d.start_date}T${d.end_time}:00+09:00`,
  };
}
