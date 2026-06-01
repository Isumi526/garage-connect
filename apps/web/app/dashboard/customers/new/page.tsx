import { createCustomer } from '@/app/dashboard/customers/actions';
import { CustomerForm } from '@/components/customers/customer-form';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireAuth } from '@/lib/auth/context';

export default async function NewCustomerPage() {
  await requireAuth();
  return (
    <>
      <PageHeader title="顧客の新規登録" />
      <CustomerForm action={createCustomer} submitLabel="登録する" />
    </>
  );
}
