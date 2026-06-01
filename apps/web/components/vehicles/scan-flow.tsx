'use client';

import { type ScanRegisterState, registerFromQr } from '@/app/(dashboard)/vehicles/scan/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrScanner } from '@/components/vehicles/qr-scanner';
import type { ParsedInspectionCertificate } from '@/lib/qr/inspection-certificate-parser';
import { useState } from 'react';
import { useFormState } from 'react-dom';

export function ScanFlow() {
  const [state, formAction] = useFormState<ScanRegisterState, FormData>(registerFromQr, null);
  const [parsed, setParsed] = useState<ParsedInspectionCertificate | null>(null);

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
          <Card>
            <CardHeader>
              <CardTitle>2. 内容を確認して登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                QR から自動入力しました。必要に応じて修正してください。
              </p>

              <fieldset className="space-y-3 rounded-md border p-4">
                <legend className="px-1 text-sm font-medium">顧客（使用者）</legend>
                <input type="hidden" name="customer_type" value="individual" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="氏名 *" name="name" defaultValue={parsed.ownerName} required />
                  <Field label="住所" name="address" defaultValue={parsed.ownerAddress} />
                </div>
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
                <SubmitButton>顧客と車両を登録</SubmitButton>
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
