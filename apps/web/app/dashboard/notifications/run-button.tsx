'use client';

import { type RunState, runNotificationsNow } from '@/app/dashboard/notifications/actions';
import { Button } from '@/components/ui/button';
import { useFormState } from 'react-dom';
import { useFormStatus } from 'react-dom';

function Inner() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? '実行中…' : '通知を今すぐ実行'}
    </Button>
  );
}

export function RunButton() {
  const [state, action] = useFormState<RunState, FormData>(() => runNotificationsNow(), null);
  return (
    <form action={action} className="flex items-center gap-3">
      <Inner />
      {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
      {state?.success && <span className="text-sm text-primary">{state.success}</span>}
    </form>
  );
}
