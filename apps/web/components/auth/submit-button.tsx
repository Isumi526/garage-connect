'use client';

import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? '処理中…' : children}
    </Button>
  );
}
