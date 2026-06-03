'use client';

import {
  type ScheduleSettingsState,
  saveScheduleSettings,
} from '@/app/dashboard/settings/schedule/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormState } from 'react-dom';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

type Hour = { weekday: number; open_time: string; close_time: string; is_closed: boolean };

export function ScheduleSettingsForm({
  hours,
  slotMinutes,
  slotCapacity,
}: {
  hours: Hour[];
  slotMinutes: number;
  slotCapacity: number;
}) {
  const [state, formAction] = useFormState<ScheduleSettingsState, FormData>(
    saveScheduleSettings,
    null,
  );
  const byWd = new Map(hours.map((h) => [h.weekday, h]));

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>営業時間・定休日</CardTitle>
          <CardDescription>曜日ごとに営業時間を設定。定休日はチェック。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {WD.map((label, wd) => {
              const h = byWd.get(wd);
              const open = h?.open_time?.slice(0, 5) ?? '09:00';
              const close = h?.close_time?.slice(0, 5) ?? '18:00';
              return (
                <div
                  key={label}
                  className="flex flex-wrap items-center gap-3 border-b py-2 text-sm"
                >
                  <span className="w-8 font-medium">{label}</span>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name={`closed_${wd}`} defaultChecked={h?.is_closed} />
                    定休日
                  </label>
                  <span className="flex items-center gap-1.5">
                    <Input type="time" name={`open_${wd}`} defaultValue={open} className="w-28" />
                    〜
                    <Input type="time" name={`close_${wd}`} defaultValue={close} className="w-28" />
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>予約枠</CardTitle>
          <CardDescription>顧客がLIFFで選べる予約枠の刻みと、1枠あたりの受付件数。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slot_minutes">予約枠の長さ</Label>
              <select
                id="slot_minutes"
                name="slot_minutes"
                defaultValue={String(slotMinutes)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="15">15分</option>
                <option value="30">30分</option>
                <option value="60">60分</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot_capacity">1枠の定員（同時受付件数）</Label>
              <Input
                id="slot_capacity"
                name="slot_capacity"
                type="number"
                min={1}
                max={99}
                defaultValue={slotCapacity}
              />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-primary">{state.success}</p>}
          <div className="w-40">
            <SubmitButton>保存する</SubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
