'use client';

import { type InviteState, inviteMember } from '@/app/(dashboard)/settings/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormState } from 'react-dom';

export function InviteForm() {
  const [state, formAction] = useFormState<InviteState, FormData>(inviteMember, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="invite-email">メールアドレス</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-name">お名前</Label>
          <Input id="invite-name" name="displayName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">権限</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="staff"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="staff">スタッフ</option>
            <option value="admin">管理者</option>
          </select>
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-primary">{state.success}</p>}
      <div className="w-40">
        <SubmitButton>招待する</SubmitButton>
      </div>
    </form>
  );
}
