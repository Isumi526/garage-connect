import { differenceInCalendarDays, parseISO } from 'date-fns';

export type ExpiryStatus = 'expired' | 'soon' | 'upcoming' | 'ok' | 'none';

/** 車検満了日までの残日数と状態を返す（基準日は today、既定は現在日） */
export function inspectionExpiryStatus(
  expiryDate: string | null | undefined,
  today: Date = new Date(),
): { status: ExpiryStatus; daysLeft: number | null } {
  if (!expiryDate) return { status: 'none', daysLeft: null };
  const days = differenceInCalendarDays(parseISO(expiryDate), today);
  if (days < 0) return { status: 'expired', daysLeft: days };
  if (days <= 30) return { status: 'soon', daysLeft: days };
  if (days <= 60) return { status: 'upcoming', daysLeft: days };
  return { status: 'ok', daysLeft: days };
}

export const EXPIRY_LABEL: Record<ExpiryStatus, string> = {
  expired: '車検切れ',
  soon: '30日以内',
  upcoming: '60日以内',
  ok: '余裕あり',
  none: '未登録',
};
