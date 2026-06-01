import { describe, expect, it } from 'vitest';
import { checkCustomerLimit, getPlan } from './plans';

describe('checkCustomerLimit', () => {
  it('free_trial は 20 件まで許可', () => {
    expect(checkCustomerLimit('free_trial', 19).allowed).toBe(true);
    expect(checkCustomerLimit('free_trial', 20).allowed).toBe(false);
  });

  it('free_trial の残数を返す', () => {
    expect(checkCustomerLimit('free_trial', 5).remaining).toBe(15);
    expect(checkCustomerLimit('free_trial', 25).remaining).toBe(0);
  });

  it('複数追加(CSV)で上限超過を検知', () => {
    expect(checkCustomerLimit('free_trial', 18, 5).allowed).toBe(false);
    expect(checkCustomerLimit('free_trial', 15, 5).allowed).toBe(true);
  });

  it('standard / pro は無制限', () => {
    expect(checkCustomerLimit('standard', 100000).allowed).toBe(true);
    expect(checkCustomerLimit('standard', 100000).limit).toBeNull();
    expect(checkCustomerLimit('pro', 999999).allowed).toBe(true);
  });

  it('不明なプランは free_trial 扱い', () => {
    expect(getPlan('unknown').id).toBe('free_trial');
    expect(checkCustomerLimit(null, 20).allowed).toBe(false);
  });
});
