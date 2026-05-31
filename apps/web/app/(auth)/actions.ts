'use server';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, signupSchema } from '@/lib/validations/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = { error: string } | null;

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
