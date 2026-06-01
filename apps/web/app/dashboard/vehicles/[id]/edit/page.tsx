import { updateVehicle } from '@/app/dashboard/vehicles/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();
  const [{ data: vehicle }, { data: customers }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', params.id).single(),
    supabase
      .from('customers')
      .select('id, name, corporate_name, customer_type')
      .order('created_at', { ascending: false }),
  ]);

  if (!vehicle) notFound();

  const action = updateVehicle.bind(null, params.id);

  return (
    <>
      <PageHeader title="車両の編集" />
      <VehicleForm
        action={action}
        customers={customers ?? []}
        defaultValues={vehicle}
        submitLabel="更新する"
      />
    </>
  );
}
