'use server';

import { clientEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/validations/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = { error: string } | null;
export type MessageState = { error?: string; success?: string } | null;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  const redirectTo = formData.get('redirect');
  revalidatePath('/', 'layout');
  redirect(
    typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/dashboard',
  );
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    tenantName: formData.get('tenantName'),
    slug: formData.get('slug'),
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  // user metadata はトリガー handle_new_user() が読み取り、
  // テナント・オーナー・既定テンプレ・トライアル課金を自動生成する。
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        tenant_name: parsed.data.tenantName,
        slug: parsed.data.slug,
        display_name: parsed.data.displayName,
      },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'このメールアドレスは既に登録されています' };
    }
    return { error: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/** パスワード再設定メールを送る。リンクは /auth/callback 経由で /reset-password へ。 */
export async function requestPasswordReset(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const redirectTo = `${clientEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`;
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  // メール存在の有無を返さない（ユーザー列挙を防ぐ）
  return {
    success:
      '入力されたメールアドレス宛に再設定用リンクを送信しました（届かない場合は迷惑メールもご確認ください）。',
  };
}

/** リカバリーセッション中に新しいパスワードを設定する。 */
export async function updatePassword(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'リンクが無効か期限切れです。お手数ですが再度お試しください。' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
