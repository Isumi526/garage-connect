'use client';

import { type MessageState, updatePassword } from '@/app/(auth)/actions';
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
import { useFormState } from 'react-dom';

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState<MessageState, FormData>(updatePassword, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>新しいパスワードを設定</CardTitle>
        <CardDescription>新しいパスワードを 2 回入力してください</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">8 文字以上</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">新しいパスワード（確認）</Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter>
          <SubmitButton>パスワードを変更する</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
