import { createVehicle } from '@/app/dashboard/vehicles/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  await requireAuth();
  const supabase = createClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, corporate_name, customer_type')
    .order('created_at', { ascending: false });

  if (!customers || customers.length === 0) {
    return (
      <>
        <PageHeader title="車両の新規登録" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            先に
            <Link href="/dashboard/customers/new" className="px-1 text-primary hover:underline">
              顧客
            </Link>
            を登録してください。車検証があれば
            <Link href="/dashboard/vehicles/scan" className="px-1 text-primary hover:underline">
              QR一括登録
            </Link>
            が便利です。
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="車両の新規登録" />
      <VehicleForm
        action={createVehicle}
        customers={customers}
        defaultCustomerId={searchParams.customer}
        submitLabel="登録する"
      />
    </>
  );
}
