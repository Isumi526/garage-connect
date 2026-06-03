'use client';

import { type ScanRegisterState, registerFromQr } from '@/app/dashboard/vehicles/scan/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrScanner } from '@/components/vehicles/qr-scanner';
import type { ParsedInspectionCertificate } from '@/lib/qr/inspection-certificate-parser';
import { useState } from 'react';
import { useFormState } from 'react-dom';

type CustomerOption = {
  id: string;
  name: string;
  corporate_name: string | null;
  customer_type: string;
};

const labelOf = (c: CustomerOption) =>
  c.customer_type === 'corporate' && c.corporate_name ? c.corporate_name : c.name;

export function ScanFlow({ customers }: { customers: CustomerOption[] }) {
  const [state, formAction] = useFormState<ScanRegisterState, FormData>(registerFromQr, null);
  const [parsed, setParsed] = useState<ParsedInspectionCertificate | null>(null);
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. 車検証QRをスキャン</CardTitle>
        </CardHeader>
        <CardContent>
          <QrScanner onParsed={setParsed} />
        </CardContent>
      </Card>

      {parsed && (
        <form action={formAction}>
          <input type="hidden" name="mode" value={mode} />
          <Card>
            <CardHeader>
              <CardTitle>2. 登録先を選んで登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 顧客の扱い：新規 or 既存 */}
              <fieldset className="space-y-3 rounded-md border p-4">
                <legend className="px-1 text-sm font-medium">顧客</legend>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode_ui"
                      checked={mode === 'new'}
                      onChange={() => setMode('new')}
                    />
                    新規顧客として登録
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode_ui"
                      checked={mode === 'existing'}
                      onChange={() => setMode('existing')}
                      disabled={customers.length === 0}
                    />
                    既存顧客に車両を追加
                    {customers.length === 0 && (
                      <span className="text-xs text-muted-foreground">（顧客なし）</span>
                    )}
                  </label>
                </div>

                {mode === 'new' ? (
                  <>
                    <input type="hidden" name="customer_type" value="individual" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="氏名 *" name="name" defaultValue={parsed.ownerName} required />
                      <Field label="住所" name="address" defaultValue={parsed.ownerAddress} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="existing_customer_id">追加先の顧客 *</Label>
                    <select
                      id="existing_customer_id"
                      name="existing_customer_id"
                      required
                      defaultValue=""
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="" disabled>
                        顧客を選択
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {labelOf(c)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      使用者名「{parsed.ownerName}」と同じ顧客を選んでください。
                    </p>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-3 rounded-md border p-4">
                <legend className="px-1 text-sm font-medium">車両</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="車両番号"
                    name="vehicle_number"
                    defaultValue={parsed.vehicleNumber}
                  />
                  <Field label="車台番号(VIN)" name="vin" defaultValue={parsed.vin} />
                  <Field label="型式" name="model_code" defaultValue={parsed.modelCode} />
                  <Field
                    label="初度登録年月日"
                    name="first_registration_date"
                    type="date"
                    defaultValue={parsed.firstRegistrationDate}
                  />
                  <Field
                    label="登録年月日"
                    name="registration_date"
                    type="date"
                    defaultValue={parsed.registrationDate}
                  />
                  <Field
                    label="車検満了日"
                    name="inspection_expiry_date"
                    type="date"
                    defaultValue={parsed.inspectionExpiryDate}
                  />
                </div>
              </fieldset>

              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <div className="w-56">
                <SubmitButton>
                  {mode === 'new' ? '顧客と車両を登録' : 'この顧客に車両を追加'}
                </SubmitButton>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
      />
    </div>
  );
}
