import { differenceInCalendarDays, parseISO } from 'date-fns';

export type TriggerType = 'inspection_expiry' | 'liability_insurance_expiry';

export interface NotifiableVehicle {
  id: string;
  customer_id: string;
  vehicle_name: string | null;
  vehicle_number: string | null;
  inspection_expiry_date: string | null;
  liability_insurance_expiry_date: string | null;
  status: string;
}

export interface NotificationTarget {
  vehicleId: string;
  customerId: string;
  triggerType: TriggerType;
  daysBefore: number;
  expiryDate: string;
}

/** 通知ルール：満了日カラム × 何日前に送るか */
const RULES: { field: keyof NotifiableVehicle; trigger: TriggerType; daysList: number[] }[] = [
  { field: 'inspection_expiry_date', trigger: 'inspection_expiry', daysList: [60, 45, 30] },
  {
    field: 'liability_insurance_expiry_date',
    trigger: 'liability_insurance_expiry',
    daysList: [30],
  },
];

/**
 * 当日(today)に通知すべき対象を抽出する純関数。
 * 満了日までの残日数がルールの「何日前」と一致する車両を返す。
 */
export function selectNotificationTargets(
  vehicles: NotifiableVehicle[],
  today: Date,
): NotificationTarget[] {
  const targets: NotificationTarget[] = [];
  for (const v of vehicles) {
    if (v.status !== 'active') continue;
    for (const rule of RULES) {
      const value = v[rule.field];
      if (!value || typeof value !== 'string') continue;
      const daysLeft = differenceInCalendarDays(parseISO(value), today);
      if (rule.daysList.includes(daysLeft)) {
        targets.push({
          vehicleId: v.id,
          customerId: v.customer_id,
          triggerType: rule.trigger,
          daysBefore: daysLeft,
          expiryDate: value,
        });
      }
    }
  }
  return targets;
}
