'use client';

import { type ImportState, importCustomers } from '@/app/(dashboard)/customers/import/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent } from '@/components/ui/card';
import { useFormState } from 'react-dom';

export function ImportForm() {
  const [state, formAction] = useFormState<ImportState, FormData>(importCustomers, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <div className="w-48">
            <SubmitButton>インポート実行</SubmitButton>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.inserted !== undefined && (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-primary">{state.inserted} 件を登録しました。</p>
              {state.errors && state.errors.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 font-medium text-amber-800">
                    {state.errors.length} 件はスキップされました：
                  </p>
                  <ul className="list-inside list-disc text-amber-700">
                    {state.errors.slice(0, 10).map((e) => (
                      <li key={e.row}>
                        {e.row} 行目: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
