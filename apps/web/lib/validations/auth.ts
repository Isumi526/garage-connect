import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const signupSchema = z
  .object({
    tenantName: z.string().min(1, '店舗名を入力してください').max(100),
    slug: z
      .string()
      .min(2, 'URL 識別子は 2 文字以上で入力してください')
      .max(40)
      .regex(/^[a-z0-9-]+$/, '英小文字・数字・ハイフンのみ使用できます'),
    displayName: z.string().min(1, 'お名前を入力してください').max(50),
    email: z.string().email('メールアドレスの形式が正しくありません'),
    password: z.string().min(8, 'パスワードは 8 文字以上で入力してください').max(72),
    passwordConfirm: z.string().min(1, '確認用パスワードを入力してください'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'パスワードが一致しません',
    path: ['passwordConfirm'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'パスワードは 8 文字以上で入力してください').max(72),
    passwordConfirm: z.string().min(1, '確認用パスワードを入力してください'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'パスワードが一致しません',
    path: ['passwordConfirm'],
  });

export const inviteSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  displayName: z.string().min(1, 'お名前を入力してください').max(50),
  role: z.enum(['admin', 'staff']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
