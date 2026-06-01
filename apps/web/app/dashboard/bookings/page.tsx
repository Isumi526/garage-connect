import { confirmBooking, rejectBooking } from '@/app/dashboard/bookings/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formatJstDate, timeSlotLabel } from '@/lib/utils/timezone';
import { BOOKING_STATUS_LABEL, BOOKING_TYPE_LABEL } from '@/lib/validations/booking';

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'destructive',
  cancelled: 'secondary',
};

export default async function BookingsPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  await requireAuth();
  const supabase = createClient();
  const status = searchParams.status ?? 'pending';

  let query = supabase
    .from('bookings')
    .select(
      'id, booking_type, preferred_date, preferred_time_slot, status, notes, customer:customers(name), vehicle:vehicles(vehicle_name, vehicle_number)',
    )
    .order('preferred_date', { ascending: true })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);

  const { data: bookings } = await query;

  const tabs = [
    { key: 'pending', label: '確認待ち' },
    { key: 'confirmed', label: '確定' },
    { key: 'all', label: 'すべて' },
  ];

  return (
    <>
      <PageHeader title="予約" description="顧客からの予約の確認・確定" />

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Button key={t.key} asChild variant={status === t.key ? 'default' : 'outline'} size="sm">
            <a href={`/dashboard/bookings?status=${t.key}`}>{t.label}</a>
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {bookings && bookings.length > 0 ? (
            <ul className="divide-y">
              {bookings.map((b) => {
                const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
                const vehicle = Array.isArray(b.vehicle) ? b.vehicle[0] : b.vehicle;
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatJstDate(b.preferred_date)}</span>
                        <span className="text-sm text-muted-foreground">
                          {timeSlotLabel(b.preferred_time_slot)}
                        </span>
                        <Badge variant={STATUS_VARIANT[b.status] ?? 'secondary'}>
                          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        {customer?.name ?? '—'} ／{' '}
                        {vehicle?.vehicle_name || vehicle?.vehicle_number || '車両'} ／{' '}
                        {BOOKING_TYPE_LABEL[b.booking_type]}
                      </p>
                      {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex gap-2">
                        <form action={confirmBooking.bind(null, b.id)}>
                          <Button type="submit" size="sm">
                            確定
                          </Button>
                        </form>
                        <form action={rejectBooking.bind(null, b.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            不可
                          </Button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-12 text-center text-muted-foreground">該当する予約がありません</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
