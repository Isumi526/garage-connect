import { updateCustomer } from '@/app/(dashboard)/customers/actions';
import { CustomerForm } from '@/components/customers/customer-form';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!customer) notFound();

  const action = updateCustomer.bind(null, params.id);

  return (
    <>
      <PageHeader title="顧客の編集" />
      <CustomerForm action={action} defaultValues={customer} submitLabel="更新する" />
    </>
  );
}
