import { openBillingPortal, startCheckout } from '@/app/dashboard/settings/billing/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { PLANS, getPlan } from '@/lib/billing/plans';
import { isStripeConfigured } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  const [{ data: sub }, { count: customerCount }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('tenant_id', tenant.id)
      .single(),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
  ]);

  const plan = getPlan(sub?.plan);
  const stripeReady = isStripeConfigured();
  const isPaid = plan.id !== 'free_trial';

  return (
    <>
      <PageHeader title="プラン・お支払い" description="ご利用プランの確認と変更" />

      {searchParams.success && (
        <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          お支払いが完了しました。ありがとうございます。
        </p>
      )}
      {searchParams.canceled && (
        <p className="mb-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
          手続きはキャンセルされました。
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              現在のプラン
              <Badge variant={isPaid ? 'success' : 'secondary'}>{plan.name}</Badge>
            </CardTitle>
            <CardDescription>
              {plan.customerLimit === null
                ? '顧客登録数: 無制限'
                : `顧客登録数: ${customerCount ?? 0} / ${plan.customerLimit} 件`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {tenant.trial_ends_at && !isPaid && (
              <p className="text-muted-foreground">
                トライアル期限: {format(new Date(tenant.trial_ends_at), 'yyyy年M月d日')}
              </p>
            )}
            {sub?.current_period_end && isPaid && (
              <p className="text-muted-foreground">
                次回更新日: {format(new Date(sub.current_period_end), 'yyyy年M月d日')}
              </p>
            )}

            {!stripeReady ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                Stripe が未設定です。`.env.local` に STRIPE_SECRET_KEY / STRIPE_PRICE_STANDARD
                を設定すると決済が有効になります。
              </p>
            ) : isPaid ? (
              <form action={openBillingPortal}>
                <Button type="submit" variant="outline">
                  お支払い情報の管理・解約
                </Button>
              </form>
            ) : (
              <form action={startCheckout}>
                <Button type="submit">
                  スタンダード（月額 ¥{PLANS.standard.priceJpy.toLocaleString()}）にアップグレード
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プラン一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {Object.values(PLANS).map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {p.customerLimit === null ? '顧客無制限' : `顧客 ${p.customerLimit} 件まで`}
                    </span>
                  </div>
                  <span className="font-semibold">
                    {p.priceJpy === 0 ? '¥0' : `¥${p.priceJpy.toLocaleString()}/月`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
