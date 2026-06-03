'use client';

import type { EventFormState } from '@/app/dashboard/calendar/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EVENT_TYPE_LABEL, eventTypes } from '@/lib/validations/schedule';
import { useState } from 'react';
import { useFormState } from 'react-dom';

type Action = (prev: EventFormState, formData: FormData) => Promise<EventFormState>;

export type EventDefaults = {
  event_type?: string;
  title?: string | null;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  notes?: string | null;
};

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export function EventForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Action;
  defaults?: EventDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<EventFormState, FormData>(action, null);
  const [allDay, setAllDay] = useState(defaults?.all_day ?? false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event_type">種別</Label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={defaults?.event_type ?? 'other'}
            className={selectClass}
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaults?.title ?? ''}
            placeholder="例: 棚卸し"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="all_day"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        終日（複数日にまたぐ休業などはこちら）
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">{allDay ? '開始日' : '日付'}</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaults?.start_date}
            required
          />
        </div>
        {allDay ? (
          <div className="space-y-2">
            <Label htmlFor="end_date">終了日（任意）</Label>
            <Input id="end_date" name="end_date" type="date" defaultValue={defaults?.end_date} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">開始</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={defaults?.start_time}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">終了</Label>
              <Input id="end_time" name="end_time" type="time" defaultValue={defaults?.end_time} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">メモ</Label>
        <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ''} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="w-40">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
