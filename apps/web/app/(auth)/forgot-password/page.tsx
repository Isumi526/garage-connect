'use client';

import { type MessageState, requestPasswordReset } from '@/app/(auth)/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useFormState } from 'react-dom';

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState<MessageState, FormData>(requestPasswordReset, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワード再設定</CardTitle>
        <CardDescription>登録メールアドレスに再設定用のリンクを送ります</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-primary">{state.success}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>再設定リンクを送る</SubmitButton>
          <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            ログインに戻る
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
