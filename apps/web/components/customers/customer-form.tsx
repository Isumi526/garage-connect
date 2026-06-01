'use client';

import type { CustomerFormState } from '@/app/(dashboard)/customers/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/types/database.types';
import { useState } from 'react';
import { useFormState } from 'react-dom';

type Customer = Database['public']['Tables']['customers']['Row'];

type Action = (prev: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: Partial<Customer>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<CustomerFormState, FormData>(action, null);
  const [type, setType] = useState(defaultValues?.customer_type ?? 'individual');

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="customer_type">顧客種別</Label>
            <select
              id="customer_type"
              name="customer_type"
              value={type}
              onChange={(e) => setType(e.target.value as 'individual' | 'corporate')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="individual">個人</option>
              <option value="corporate">法人</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{type === 'corporate' ? '担当者名' : '氏名'} *</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_kana">フリガナ</Label>
              <Input
                id="name_kana"
                name="name_kana"
                defaultValue={defaultValues?.name_kana ?? ''}
              />
            </div>
          </div>

          {type === 'corporate' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="corporate_name">法人名</Label>
                <Input
                  id="corporate_name"
                  name="corporate_name"
                  defaultValue={defaultValues?.corporate_name ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representative_name">代表者名</Label>
                <Input
                  id="representative_name"
                  name="representative_name"
                  defaultValue={defaultValues?.representative_name ?? ''}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaultValues?.email ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postal_code">郵便番号</Label>
              <Input
                id="postal_code"
                name="postal_code"
                defaultValue={defaultValues?.postal_code ?? ''}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">住所</Label>
              <Input id="address" name="address" defaultValue={defaultValues?.address ?? ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">メモ</Label>
            <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ''} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="w-48">
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
