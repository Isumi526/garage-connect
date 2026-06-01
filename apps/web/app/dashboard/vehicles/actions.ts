'use server';

import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formToObject } from '@/lib/validations/helpers';
import { vehicleSchema } from '@/lib/validations/vehicle';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type VehicleFormState = { error: string } | null;

export async function createVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const { tenant } = await requireAuth();
  const parsed = vehicleSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...parsed.data, tenant_id: tenant.id })
    .select('id')
    .single();

  if (error || !data) {
    return { error: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` };
  }

  revalidatePath('/dashboard/vehicles');
  redirect(`/dashboard/vehicles/${data.id}`);
}

export async function updateVehicle(
  id: string,
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  await requireAuth();
  const parsed = vehicleSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('vehicles').update(parsed.data).eq('id', id);
  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath('/dashboard/vehicles');
  revalidatePath(`/dashboard/vehicles/${id}`);
  redirect(`/dashboard/vehicles/${id}`);
}

export async function deleteVehicle(id: string): Promise<void> {
  await requireAuth();
  const supabase = createClient();
  await supabase.from('vehicles').delete().eq('id', id);
  revalidatePath('/dashboard/vehicles');
  redirect('/dashboard/vehicles');
}
