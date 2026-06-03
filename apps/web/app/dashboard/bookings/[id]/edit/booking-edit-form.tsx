'use client';

import { type BookingEditState, updateBooking } from '@/app/dashboard/bookings/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BOOKING_STATUS_LABEL, BOOKING_TYPE_LABEL, bookingTypes } from '@/lib/validations/booking';
import { useFormState } from 'react-dom';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled'];

type Booking = {
  id: string;
  booking_type: string;
  preferred_date: string;
  preferred_time_slot: string | null;
  status: string;
  notes: string | null;
};

export function BookingEditForm({ booking }: { booking: Booking }) {
  const action = updateBooking.bind(null, booking.id);
  const [state, formAction] = useFormState<BookingEditState, FormData>(action, null);
  const time = /^\d{2}:\d{2}$/.test(booking.preferred_time_slot ?? '')
    ? (booking.preferred_time_slot as string)
    : '09:00';

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preferred_date">希望日</Label>
          <Input
            id="preferred_date"
            name="preferred_date"
            type="date"
            defaultValue={booking.preferred_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred_time_slot">時刻</Label>
          <Input
            id="preferred_time_slot"
            name="preferred_time_slot"
            type="time"
            defaultValue={time}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking_type">内容</Label>
          <select
            id="booking_type"
            name="booking_type"
            defaultValue={booking.booking_type}
            className={selectClass}
          >
            {bookingTypes.map((t) => (
              <option key={t} value={t}>
                {BOOKING_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">状態</Label>
          <select id="status" name="status" defaultValue={booking.status} className={selectClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">メモ</Label>
        <Textarea id="notes" name="notes" defaultValue={booking.notes ?? ''} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="w-40">
        <SubmitButton>更新する</SubmitButton>
      </div>
    </form>
  );
}
