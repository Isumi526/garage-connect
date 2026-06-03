import { deleteBooking } from '@/app/dashboard/bookings/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { DeleteButton } from '@/components/shared/delete-button';
import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formatJstDate } from '@/lib/utils/timezone';
import { notFound, redirect } from 'next/navigation';
import { BookingEditForm } from './booking-edit-form';

export default async function EditBookingPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select(
      'id, booking_type, preferred_date, preferred_time_slot, status, notes, customer:customers(name), vehicle:vehicles(vehicle_name, vehicle_number)',
    )
    .eq('id', params.id)
    .single();
  if (!booking) notFound();

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  const vehicle = Array.isArray(booking.vehicle) ? booking.vehicle[0] : booking.vehicle;

  async function remove() {
    'use server';
    await deleteBooking(params.id);
    redirect('/dashboard/bookings');
  }

  return (
    <>
      <PageHeader
        title="予約の編集"
        description={`${customer?.name ?? ''} ／ ${vehicle?.vehicle_name || vehicle?.vehicle_number || '車両'} ／ ${formatJstDate(booking.preferred_date)}`}
        action={<DeleteButton action={remove} label="予約を削除" />}
      />
      <Card>
        <CardContent className="pt-6">
          <BookingEditForm booking={booking} />
        </CardContent>
      </Card>
    </>
  );
}
