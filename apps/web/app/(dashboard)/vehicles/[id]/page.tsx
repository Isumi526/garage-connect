import { deleteVehicle } from '@/app/(dashboard)/vehicles/actions';
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

function fmt(d: string | null) {
  return d ? format(new Date(d), 'yyyy/MM/dd') : '—';
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*, customer:customers(id, name, corporate_name, customer_type)')
    .eq('id', params.id)
    .single();
  if (!vehicle) notFound();

  const customer = Array.isArray(vehicle.customer) ? vehicle.customer[0] : vehicle.customer;
  const { status } = inspectionExpiryStatus(vehicle.inspection_expiry_date);

  const rows: { label: string; value: string }[] = [
    { label: '車名', value: vehicle.vehicle_name ?? '—' },
    { label: '車両番号', value: vehicle.vehicle_number ?? '—' },
    { label: '車台番号(VIN)', value: vehicle.vin ?? '—' },
    { label: '型式', value: vehicle.model_code ?? '—' },
    { label: '車検満了日', value: fmt(vehicle.inspection_expiry_date) },
    { label: '初度登録', value: fmt(vehicle.first_registration_date) },
    { label: '自賠責満了日', value: fmt(vehicle.liability_insurance_expiry_date) },
    { label: '任意保険満了日', value: fmt(vehicle.voluntary_insurance_expiry_date) },
    { label: '燃料種別', value: vehicle.fuel_type ?? '—' },
    { label: '排気量', value: vehicle.displacement ? `${vehicle.displacement} cc` : '—' },
    {
      label: '走行距離',
      value: vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString()} km` : '—',
    },
    { label: 'メモ', value: vehicle.notes ?? '—' },
  ];

  return (
    <>
      <PageHeader
        title={vehicle.vehicle_name || vehicle.vehicle_number || '車両詳細'}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>編集</Link>
            </Button>
            <DeleteButton action={deleteVehicle.bind(null, vehicle.id)} />
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        {status !== 'none' && (
          <Badge
            variant={
              status === 'expired' ? 'destructive' : status === 'soon' ? 'warning' : 'secondary'
            }
          >
            車検: {EXPIRY_LABEL[status]}
          </Badge>
        )}
        {customer && (
          <span className="text-sm text-muted-foreground">
            顧客:{' '}
            <Link
              href={`/dashboard/customers/${customer.id}`}
              className="text-primary hover:underline"
            >
              {customer.customer_type === 'corporate' && customer.corporate_name
                ? customer.corporate_name
                : customer.name}
            </Link>
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>車両情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 border-b py-2">
                <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
                <dd className="text-right font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
