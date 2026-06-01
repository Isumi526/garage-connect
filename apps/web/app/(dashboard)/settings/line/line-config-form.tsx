'use client';

import {
  type LineConfigState,
  saveLineConfig,
  verifyLineToken,
} from '@/app/(dashboard)/settings/line/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormState } from 'react-dom';

export function LineConfigForm({
  channelId,
  liffId,
  hasAccessToken,
  hasChannelSecret,
}: {
  channelId: string;
  liffId: string;
  hasAccessToken: boolean;
  hasChannelSecret: boolean;
}) {
  const [state, formAction] = useFormState<LineConfigState, FormData>(saveLineConfig, null);
  const [verifyState, verifyAction] = useFormState<LineConfigState, FormData>(
    () => verifyLineToken(),
    null,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="line_channel_id">Channel ID</Label>
            <Input id="line_channel_id" name="line_channel_id" defaultValue={channelId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liff_id">LIFF ID</Label>
            <Input id="liff_id" name="liff_id" defaultValue={liffId} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="access_token">
            Channel Access Token{' '}
            {hasAccessToken && <span className="text-primary">（設定済み）</span>}
          </Label>
          <Input
            id="access_token"
            name="access_token"
            type="password"
            placeholder={hasAccessToken ? '変更する場合のみ入力' : '入力してください'}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="channel_secret">
            Channel Secret {hasChannelSecret && <span className="text-primary">（設定済み）</span>}
          </Label>
          <Input
            id="channel_secret"
            name="channel_secret"
            type="password"
            placeholder={hasChannelSecret ? '変更する場合のみ入力' : '入力してください'}
            autoComplete="off"
          />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-primary">{state.success}</p>}

        <div className="flex items-center gap-2">
          <div className="w-40">
            <SubmitButton>保存する</SubmitButton>
          </div>
        </div>
      </form>

      <form action={verifyAction}>
        <Button type="submit" variant="outline" size="sm" disabled={!hasAccessToken}>
          保存済みトークンで疎通テスト
        </Button>
        {verifyState?.error && <p className="mt-2 text-sm text-destructive">{verifyState.error}</p>}
        {verifyState?.success && <p className="mt-2 text-sm text-primary">{verifyState.success}</p>}
      </form>
    </div>
  );
}
