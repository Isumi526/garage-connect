'use server';

import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { customerSchema } from '@/lib/validations/customer';
import { formToObject } from '@/lib/validations/helpers';
import { vehicleSchema } from '@/lib/validations/vehicle';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ScanRegisterState = { error: string } | null;

const vehicleCoreSchema = vehicleSchema.omit({ customer_id: true });

/**
 * 車検証QRから読み取った内容で「顧客 + 車両」を一括登録する。
 * 顧客（使用者）を作成し、その customer_id で車両を作成する。
 */
export async function registerFromQr(
  _prev: ScanRegisterState,
  formData: FormData,
): Promise<ScanRegisterState> {
  const { tenant } = await requireAuth();
  const raw = formToObject(formData);

  const customerParsed = customerSchema.safeParse(raw);
  if (!customerParsed.success) {
    return {
      error: `顧客情報: ${customerParsed.error.errors[0]?.message ?? '入力を確認してください'}`,
    };
  }
  const vehicleParsed = vehicleCoreSchema.safeParse(raw);
  if (!vehicleParsed.success) {
    return {
      error: `車両情報: ${vehicleParsed.error.errors[0]?.message ?? '入力を確認してください'}`,
    };
  }

  const supabase = createClient();

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({ ...customerParsed.data, tenant_id: tenant.id })
    .select('id')
    .single();
  if (customerError || !customer) {
    return { error: `顧客の登録に失敗しました: ${customerError?.message ?? '不明なエラー'}` };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({ ...vehicleParsed.data, customer_id: customer.id, tenant_id: tenant.id })
    .select('id')
    .single();
  if (vehicleError || !vehicle) {
    // 車両登録に失敗したら、作成した顧客も巻き戻す（孤立顧客を残さない）
    await supabase.from('customers').delete().eq('id', customer.id);
    return { error: `車両の登録に失敗しました: ${vehicleError?.message ?? '不明なエラー'}` };
  }

  revalidatePath('/dashboard/vehicles');
  revalidatePath('/dashboard/customers');
  redirect(`/dashboard/vehicles/${vehicle.id}`);
}
