'use server';

import { requireAuth } from '@/lib/auth/context';
import { customerCapacity, limitMessage } from '@/lib/billing/limit-check';
import { createClient } from '@/lib/supabase/server';
import { customerSchema } from '@/lib/validations/customer';
import { formToObject } from '@/lib/validations/helpers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type CustomerFormState = { error: string } | null;

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const { tenant } = await requireAuth();
  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();

  const capacity = await customerCapacity(supabase, tenant.id);
  if (!capacity.allowed && capacity.limit !== null) {
    return { error: limitMessage(capacity.limit) };
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...parsed.data, tenant_id: tenant.id })
    .select('id')
    .single();

  if (error || !data) {
    return { error: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` };
  }

  revalidatePath('/dashboard/customers');
  redirect(`/dashboard/customers/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireAuth();
  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  // tenant_id は RLS で保護されるため更新対象に含めない
  const { error } = await supabase.from('customers').update(parsed.data).eq('id', id);
  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath('/dashboard/customers');
  revalidatePath(`/dashboard/customers/${id}`);
  redirect(`/dashboard/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<void> {
  await requireAuth();
  const supabase = createClient();
  await supabase.from('customers').delete().eq('id', id);
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}
