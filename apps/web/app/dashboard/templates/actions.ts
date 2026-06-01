'use server';

import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type TemplateState = { error?: string; success?: string } | null;

const schema = z.object({
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(1, '本文を入力してください').max(2000),
  is_active: z.boolean(),
});

export async function updateTemplate(
  id: string,
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  await requireAuth();
  const parsed = schema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
    is_active: formData.get('is_active') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '入力内容を確認してください' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('notification_templates')
    .update({
      title: parsed.data.title || null,
      body: parsed.data.body,
      is_active: parsed.data.is_active,
    })
    .eq('id', id);
  if (error) return { error: `保存に失敗しました: ${error.message}` };

  revalidatePath('/dashboard/templates');
  return { success: '保存しました' };
}
