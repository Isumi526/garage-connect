import { z } from 'zod';

export const bookingTypes = ['inspection', 'maintenance', 'other'] as const;

export const bookingInputSchema = z.object({
  vehicle_id: z.string().uuid('車両を選択してください'),
  booking_type: z.enum(bookingTypes).default('inspection'),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '希望日を選択してください'),
  // 予約枠（HH:MM）。空き枠から選択する。
  preferred_time_slot: z.string().regex(/^\d{2}:\d{2}$/, '時間枠を選択してください'),
  notes: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const BOOKING_TYPE_LABEL: Record<string, string> = {
  inspection: '車検',
  maintenance: '点検・整備',
  other: 'その他',
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: '確認待ち',
  confirmed: '確定',
  rejected: '不可',
  cancelled: 'キャンセル',
};
