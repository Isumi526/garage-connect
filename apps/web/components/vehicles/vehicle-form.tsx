'use client';

import type { VehicleFormState } from '@/app/dashboard/vehicles/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/types/database.types';
import { useFormState } from 'react-dom';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Action = (prev: VehicleFormState, formData: FormData) => Promise<VehicleFormState>;

export function VehicleForm({
  action,
  customers,
  defaultValues,
  defaultCustomerId,
  submitLabel,
}: {
  action: Action;
  customers: { id: string; name: string; corporate_name: string | null; customer_type: string }[];
  defaultValues?: Partial<Vehicle>;
  defaultCustomerId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<VehicleFormState, FormData>(action, null);
  const selectedCustomer = defaultValues?.customer_id ?? defaultCustomerId ?? '';

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="customer_id">顧客 *</Label>
            <select
              id="customer_id"
              name="customer_id"
              defaultValue={selectedCustomer}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_type === 'corporate' && c.corporate_name ? c.corporate_name : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="vehicle_name" label="車名" defaultValue={defaultValues?.vehicle_name} />
            <Text
              name="vehicle_number"
              label="車両番号"
              defaultValue={defaultValues?.vehicle_number}
            />
            <Text name="vin" label="車台番号(VIN)" defaultValue={defaultValues?.vin} />
            <Text name="model_code" label="型式" defaultValue={defaultValues?.model_code} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              name="inspection_expiry_date"
              label="車検満了日"
              type="date"
              defaultValue={defaultValues?.inspection_expiry_date}
            />
            <Text
              name="first_registration_date"
              label="初度登録年月日"
              type="date"
              defaultValue={defaultValues?.first_registration_date}
            />
            <Text
              name="liability_insurance_expiry_date"
              label="自賠責満了日"
              type="date"
              defaultValue={defaultValues?.liability_insurance_expiry_date}
            />
            <Text
              name="voluntary_insurance_expiry_date"
              label="任意保険満了日"
              type="date"
              defaultValue={defaultValues?.voluntary_insurance_expiry_date}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="fuel_type" label="燃料種別" defaultValue={defaultValues?.fuel_type} />
            <Text
              name="displacement"
              label="排気量(cc)"
              type="number"
              defaultValue={defaultValues?.displacement}
            />
            <Text
              name="current_mileage"
              label="走行距離(km)"
              type="number"
              defaultValue={defaultValues?.current_mileage}
            />
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

function Text({
  name,
  label,
  defaultValue,
  type = 'text',
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} />
    </div>
  );
}
