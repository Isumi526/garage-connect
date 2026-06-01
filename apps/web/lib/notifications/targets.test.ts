import { describe, expect, it } from 'vitest';
import { type NotifiableVehicle, selectNotificationTargets } from './targets';

const today = new Date('2026-06-01T00:00:00+09:00');

function vehicle(over: Partial<NotifiableVehicle>): NotifiableVehicle {
  return {
    id: 'v1',
    customer_id: 'c1',
    vehicle_name: 'テスト車',
    vehicle_number: null,
    inspection_expiry_date: null,
    liability_insurance_expiry_date: null,
    status: 'active',
    ...over,
  };
}

describe('selectNotificationTargets', () => {
  it('車検満了 60/45/30 日前のちょうどの日に対象になる', () => {
    // 60日前 = 2026-07-31, 45日前 = 2026-07-16, 30日前 = 2026-07-01
    const v60 = vehicle({ id: 'v60', inspection_expiry_date: '2026-07-31' });
    const v45 = vehicle({ id: 'v45', inspection_expiry_date: '2026-07-16' });
    const v30 = vehicle({ id: 'v30', inspection_expiry_date: '2026-07-01' });
    const targets = selectNotificationTargets([v60, v45, v30], today);
    expect(targets.map((t) => t.vehicleId).sort()).toEqual(['v30', 'v45', 'v60']);
    expect(targets.every((t) => t.triggerType === 'inspection_expiry')).toBe(true);
  });

  it('対象外の残日数(例: 50日前)は通知しない', () => {
    const v = vehicle({ inspection_expiry_date: '2026-07-21' }); // 50日後
    expect(selectNotificationTargets([v], today)).toHaveLength(0);
  });

  it('自賠責は 30 日前のみ対象', () => {
    const v = vehicle({ liability_insurance_expiry_date: '2026-07-01' });
    const targets = selectNotificationTargets([v], today);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.triggerType).toBe('liability_insurance_expiry');
  });

  it('status が active 以外は除外', () => {
    const v = vehicle({ inspection_expiry_date: '2026-07-01', status: 'inactive' });
    expect(selectNotificationTargets([v], today)).toHaveLength(0);
  });

  it('車検と自賠責が同日満了なら両方の対象になりうる', () => {
    const v = vehicle({
      inspection_expiry_date: '2026-07-01',
      liability_insurance_expiry_date: '2026-07-01',
    });
    const targets = selectNotificationTargets([v], today);
    expect(targets).toHaveLength(2);
  });
});
