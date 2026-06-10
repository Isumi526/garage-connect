import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { EXPIRY_LABEL, type ExpiryStatus, inspectionExpiryStatus } from '@/lib/utils/expiry';
import { format } from 'date-fns';
import Link from 'next/link';

const BADGE_VARIANT: Record<ExpiryStatus, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  expired: 'destructive',
  soon: 'warning',
  upcoming: 'secondary',
  ok: 'outline',
  none: 'outline',
};

export default async function VehiclesPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireAuth();
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? '';

  let query = supabase
    .from('vehicles')
    .select(
      'id, vehicle_name, vehicle_number, vin, inspection_expiry_date, customer:customers(id, name, corporate_name, customer_type)',
    )
    // 車検満了日の昇順（近い順）。未登録は末尾。
    .order('inspection_expiry_date', { ascending: true, nullsFirst: false })
    .limit(300);

  if (q) {
    const like = `%${q}%`;
    query = query.or(`vehicle_name.ilike.${like},vehicle_number.ilike.${like},vin.ilike.${like}`);
  }

  const { data: vehicles } = await query;

  return (
    <>
      <PageHeader
        title="車両"
        description="車検満了日の近い順に表示"
        action={
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/vehicles/scan">車検証から登録</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/vehicles/new">新規登録</Link>
            </Button>
          </div>
        }
      />

      <form className="mb-4 flex gap-2" action="/dashboard/vehicles">
        <Input
          name="q"
          placeholder="車名・車両番号・車台番号で検索"
          defaultValue={q}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          検索
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {vehicles && vehicles.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">車両</th>
                  <th className="px-4 py-3 font-medium">顧客</th>
                  <th className="px-4 py-3 font-medium">車検満了日</th>
                  <th className="px-4 py-3 font-medium">状態</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const { status, daysLeft } = inspectionExpiryStatus(v.inspection_expiry_date);
                  const customer = Array.isArray(v.customer) ? v.customer[0] : v.customer;
                  const customerName = customer
                    ? customer.customer_type === 'corporate' && customer.corporate_name
                      ? customer.corporate_name
                      : customer.name
                    : '—';
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/vehicles/${v.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {v.vehicle_name || v.vehicle_number || '（名称未設定）'}
                        </Link>
                        {v.vehicle_number && v.vehicle_name && (
                          <p className="text-xs text-muted-foreground">{v.vehicle_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{customerName}</td>
                      <td className="px-4 py-3">
                        {v.inspection_expiry_date
                          ? format(new Date(v.inspection_expiry_date), 'yyyy/MM/dd')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={BADGE_VARIANT[status]}>{EXPIRY_LABEL[status]}</Badge>
                          {daysLeft !== null && status !== 'none' && (
                            <span className="text-xs text-muted-foreground">
                              {daysLeft >= 0 ? `あと${daysLeft}日` : `${-daysLeft}日超過`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              {q ? '該当する車両がありません' : '車両がまだ登録されていません'}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
