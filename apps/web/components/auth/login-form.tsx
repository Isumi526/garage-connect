'use client';

import { type ActionState, login } from '@/app/(auth)/actions';
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

export function LoginForm({ redirect }: { redirect: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(login, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
        <CardDescription>Garage Connect 管理画面にログインします</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>ログイン</SubmitButton>
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              新規登録
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
