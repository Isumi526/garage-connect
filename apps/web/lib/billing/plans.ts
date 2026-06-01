/**
 * 料金プランとプラン制限。
 * Free Trial は顧客 20 件まで。Standard / Pro は無制限。
 */
export type PlanId = 'free_trial' | 'standard' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  priceJpy: number;
  customerLimit: number | null; // null = 無制限
}

export const PLANS: Record<PlanId, Plan> = {
  free_trial: { id: 'free_trial', name: 'フリートライアル', priceJpy: 0, customerLimit: 20 },
  standard: { id: 'standard', name: 'スタンダード', priceJpy: 3000, customerLimit: null },
  pro: { id: 'pro', name: 'プロ', priceJpy: 8000, customerLimit: null },
};

export function getPlan(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free_trial;
}

/**
 * 顧客追加が許可されるかを判定する純関数。
 * @param planId プラン
 * @param currentCount 現在の顧客数
 * @param adding 追加しようとする件数（既定 1）
 */
export function checkCustomerLimit(
  planId: string | null | undefined,
  currentCount: number,
  adding = 1,
): { allowed: boolean; limit: number | null; remaining: number | null } {
  const plan = getPlan(planId);
  if (plan.customerLimit === null) {
    return { allowed: true, limit: null, remaining: null };
  }
  const remaining = Math.max(0, plan.customerLimit - currentCount);
  return {
    allowed: currentCount + adding <= plan.customerLimit,
    limit: plan.customerLimit,
    remaining,
  };
}
