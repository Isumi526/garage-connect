'use server';

import { requireAuth } from '@/lib/auth/context';
import { customerCapacity } from '@/lib/billing/limit-check';
import { parseCsv } from '@/lib/csv/parse';
import { createClient } from '@/lib/supabase/server';
import { customerSchema } from '@/lib/validations/customer';
import { revalidatePath } from 'next/cache';

export type ImportState = {
  inserted?: number;
  errors?: { row: number; message: string }[];
  error?: string;
} | null;

/** CSV ヘッダ（日本語） → DB カラムの対応 */
const HEADER_MAP: Record<string, string> = {
  種別: 'customer_type',
  氏名: 'name',
  フリガナ: 'name_kana',
  電話番号: 'phone',
  メール: 'email',
  郵便番号: 'postal_code',
  住所: 'address',
  法人名: 'corporate_name',
  代表者名: 'representative_name',
  メモ: 'notes',
};

function mapRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [jp, value] of Object.entries(row)) {
    const key = HEADER_MAP[jp.trim()];
    if (!key) continue;
    if (key === 'customer_type') {
      out.customer_type = value.trim() === '法人' ? 'corporate' : 'individual';
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function importCustomers(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { tenant } = await requireAuth();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'CSV ファイルを選択してください' };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { error: 'データ行がありません（先頭行はヘッダとして扱われます）' };
  }

  const errors: { row: number; message: string }[] = [];
  const valid: Record<string, unknown>[] = [];

  rows.forEach((row, i) => {
    const parsed = customerSchema.safeParse(mapRow(row));
    if (parsed.success) {
      valid.push({ ...parsed.data, tenant_id: tenant.id });
    } else {
      errors.push({ row: i + 2, message: parsed.error.errors[0]?.message ?? '不正なデータ' });
    }
  });

  const supabase = createClient();

  // プラン上限（フリートライアル 20 件）を超える分は取り込まない
  const capacity = await customerCapacity(supabase, tenant.id, valid.length);
  let toInsert = valid;
  if (!capacity.allowed && capacity.remaining !== null) {
    toInsert = valid.slice(0, capacity.remaining);
    errors.push({
      row: 0,
      message: `プラン上限(${capacity.limit}件)のため ${valid.length - toInsert.length} 件を取り込みませんでした。アップグレードで全件登録できます。`,
    });
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    // 100 件ずつ分割して投入
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { error, count } = await supabase
        .from('customers')
        // biome-ignore lint/suspicious/noExplicitAny: 動的に組んだ行の型
        .insert(chunk as any, { count: 'exact' });
      if (error) {
        return { error: `登録中にエラー: ${error.message}`, inserted, errors };
      }
      inserted += count ?? chunk.length;
    }
  }

  revalidatePath('/dashboard/customers');
  return { inserted, errors };
}
