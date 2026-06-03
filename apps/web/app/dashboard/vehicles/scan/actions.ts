'use server';

import { requireAuth } from '@/lib/auth/context';
import { customerCapacity, limitMessage } from '@/lib/billing/limit-check';
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
  const mode = raw.mode === 'existing' ? 'existing' : 'new';
  const existingCustomerId =
    typeof raw.existing_customer_id === 'string' ? raw.existing_customer_id : '';

  const vehicleParsed = vehicleCoreSchema.safeParse(raw);
  if (!vehicleParsed.success) {
    return {
      error: `車両情報: ${vehicleParsed.error.errors[0]?.message ?? '入力を確認してください'}`,
    };
  }

  // 新規顧客モードのときだけ顧客情報を検証する
  const customerParsed = customerSchema.safeParse(raw);
  if (mode === 'new' && !customerParsed.success) {
    return {
      error: `顧客情報: ${customerParsed.error.errors[0]?.message ?? '入力を確認してください'}`,
    };
  }

  const supabase = createClient();

  // 同一車台番号(VIN)の重複ガード（VIN がある場合のみ）
  if (vehicleParsed.data.vin) {
    const { data: dup } = await supabase
      .from('vehicles')
      .select('id')
      .eq('vin', vehicleParsed.data.vin)
      .maybeSingle();
    if (dup) {
      return { error: 'この車台番号(VIN)の車両は既に登録されています。' };
    }
  }

  // 顧客の決定：既存に追加 or 新規作成
  let customerId: string;
  let createdNewCustomer = false;

  if (mode === 'existing') {
    if (!existingCustomerId) {
      return { error: '追加先の既存顧客を選択してください。' };
    }
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('id', existingCustomerId)
      .maybeSingle(); // RLS で自テナントに限定
    if (!existing) {
      return { error: '選択された顧客が見つかりません。' };
    }
    customerId = existing.id;
  } else {
    if (!customerParsed.success) {
      return { error: '顧客情報を確認してください' };
    }
    const capacity = await customerCapacity(supabase, tenant.id);
    if (!capacity.allowed && capacity.limit !== null) {
      return { error: limitMessage(capacity.limit) };
    }
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({ ...customerParsed.data, tenant_id: tenant.id })
      .select('id')
      .single();
    if (customerError || !customer) {
      return { error: `顧客の登録に失敗しました: ${customerError?.message ?? '不明なエラー'}` };
    }
    customerId = customer.id;
    createdNewCustomer = true;
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({ ...vehicleParsed.data, customer_id: customerId, tenant_id: tenant.id })
    .select('id')
    .single();
  if (vehicleError || !vehicle) {
    // 新規作成した顧客のみ巻き戻す（既存顧客は消さない）
    if (createdNewCustomer) {
      await supabase.from('customers').delete().eq('id', customerId);
    }
    return { error: `車両の登録に失敗しました: ${vehicleError?.message ?? '不明なエラー'}` };
  }

  revalidatePath('/dashboard/vehicles');
  revalidatePath('/dashboard/customers');
  redirect(`/dashboard/vehicles/${vehicle.id}`);
}
