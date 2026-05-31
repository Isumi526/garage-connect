import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { addDays, format } from 'date-fns';

export default async function DashboardPage() {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  const today = new Date();
  const in60 = format(addDays(today, 60), 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');

  // RLS により自テナント分のみ集計される
  const [
    { count: customerCount },
    { count: vehicleCount },
    { count: upcomingCount },
    { count: monthlyNotifications },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('inspection_expiry_date', todayStr)
      .lte('inspection_expiry_date', in60),
    supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', monthStart),
  ]);

  const stats = [
    { label: '顧客数', value: customerCount ?? 0 },
    { label: '車両数', value: vehicleCount ?? 0 },
    { label: '60 日以内の車検満了', value: upcomingCount ?? 0 },
    { label: '今月の配信数', value: monthlyNotifications ?? 0 },
  ];

  const trialEnds = tenant.trial_ends_at
    ? format(new Date(tenant.trial_ends_at), 'yyyy年M月d日')
    : null;

  return (
    <>
      <PageHeader title="ダッシュボード" description={`${tenant.name} の概況`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {trialEnds && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm">
              現在は <span className="font-semibold">無料トライアル</span> 期間です（{trialEnds}{' '}
              まで）。
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
