import { deleteCustomer } from '@/app/(dashboard)/customers/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { DeleteButton } from '@/components/shared/delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { EXPIRY_LABEL, inspectionExpiryStatus } from '@/lib/utils/expiry';
import { format } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!customer) notFound();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, vehicle_name, vehicle_number, inspection_expiry_date, status')
    .eq('customer_id', params.id)
    .order('inspection_expiry_date', { ascending: true, nullsFirst: false });

  const displayName =
    customer.customer_type === 'corporate' && customer.corporate_name
      ? customer.corporate_name
      : customer.name;

  const rows: { label: string; value: string | null }[] = [
    { label: '種別', value: customer.customer_type === 'corporate' ? '法人' : '個人' },
    { label: '氏名 / 担当者', value: customer.name },
    { label: 'フリガナ', value: customer.name_kana },
    { label: '法人名', value: customer.corporate_name },
    { label: '代表者名', value: customer.representative_name },
    { label: '電話番号', value: customer.phone },
    { label: 'メール', value: customer.email },
    { label: '郵便番号', value: customer.postal_code },
    { label: '住所', value: customer.address },
    { label: 'メモ', value: customer.notes },
  ];

  return (
    <>
      <PageHeader
        title={displayName}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/customers/${customer.id}/edit`}>編集</Link>
            </Button>
            <DeleteButton action={deleteCustomer.bind(null, customer.id)} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>顧客情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {rows
                .filter((r) => r.value)
                .map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 py-2">
                    <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
                    <dd className="text-right font-medium">{r.value}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>保有車両（{vehicles?.length ?? 0}）</CardTitle>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/dashboard/vehicles/new?customer=${customer.id}`}>車両を追加</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {vehicles && vehicles.length > 0 ? (
              <ul className="divide-y">
                {vehicles.map((v) => {
                  const { status } = inspectionExpiryStatus(v.inspection_expiry_date);
                  return (
                    <li key={v.id} className="flex items-center justify-between py-3">
                      <Link
                        href={`/dashboard/vehicles/${v.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {v.vehicle_name || v.vehicle_number || '（名称未設定）'}
                      </Link>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {v.inspection_expiry_date
                            ? format(new Date(v.inspection_expiry_date), 'yyyy/MM/dd')
                            : '車検満了日未登録'}
                        </span>
                        {(status === 'expired' || status === 'soon') && (
                          <Badge variant={status === 'expired' ? 'destructive' : 'warning'}>
                            {EXPIRY_LABEL[status]}
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-muted-foreground">車両が登録されていません</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
