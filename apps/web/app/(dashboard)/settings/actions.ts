'use server';

import { requireAuth } from '@/lib/auth/context';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteSchema } from '@/lib/validations/auth';
import { revalidatePath } from 'next/cache';

export type InviteState = { error?: string; success?: string } | null;

/**
 * 同一テナントへスタッフを招待する。
 * owner/admin のみ実行可。Admin API でユーザーを作成し、
 * metadata の invited_tenant_id を handle_new_user() が読み取り、
 * 既存テナントへ shop_users 行として登録する。
 */
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { tenant, shopUser } = await requireAuth();

  if (!['owner', 'admin'].includes(shopUser.role)) {
    return { error: '招待する権限がありません' };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    displayName: formData.get('displayName'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const admin = createAdminClient();
  // inviteUserByEmail は招待メール（マジックリンク）を送る。
  // metadata は raw_user_meta_data に入り、トリガーがテナント参加を処理する。
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      invited_tenant_id: tenant.id,
      invited_role: parsed.data.role,
      display_name: parsed.data.displayName,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'このメールアドレスは既に登録されています' };
    }
    return { error: `招待に失敗しました: ${error.message}` };
  }

  revalidatePath('/dashboard/settings');
  return { success: `${parsed.data.email} を招待しました` };
}
