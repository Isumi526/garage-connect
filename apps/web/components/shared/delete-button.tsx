'use client';

import { Button } from '@/components/ui/button';

/**
 * 削除確認付きボタン。`action` には bind 済みの server action を渡す。
 */
export function DeleteButton({
  action,
  confirmMessage = 'この操作は取り消せません。本当に削除しますか？',
  label = '削除',
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        {label}
      </Button>
    </form>
  );
}
