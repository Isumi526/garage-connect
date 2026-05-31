'use client';

import { type ActionState, signup } from '@/app/(auth)/actions';
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

export default function SignupPage() {
  const [state, formAction] = useFormState<ActionState, FormData>(signup, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規登録</CardTitle>
        <CardDescription>店舗アカウントを作成します（30 日間無料）</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">店舗名</Label>
            <Input id="tenantName" name="tenantName" placeholder="〇〇自動車整備" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL 識別子</Label>
            <Input id="slug" name="slug" placeholder="my-garage" required />
            <p className="text-xs text-muted-foreground">英小文字・数字・ハイフン</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">お名前</Label>
            <Input id="displayName" name="displayName" placeholder="山田 太郎" required />
          </div>
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
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">8 文字以上</p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton>登録してはじめる</SubmitButton>
          <p className="text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
