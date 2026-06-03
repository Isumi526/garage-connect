import { updateEvent } from '@/app/dashboard/calendar/actions';
import { EventForm } from '@/app/dashboard/calendar/event-form';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { jstDateOf, jstTimeOf } from '@/lib/utils/calendar';
import { notFound } from 'next/navigation';

export default async function EditEventPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = createClient();
  const { data: e } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!e) notFound();

  const action = updateEvent.bind(null, params.id);

  return (
    <>
      <PageHeader title="予定を編集" />
      <div className="max-w-2xl">
        <EventForm
          action={action}
          submitLabel="更新する"
          defaults={{
            event_type: e.event_type,
            title: e.title,
            notes: e.notes,
            all_day: e.all_day,
            start_date: jstDateOf(e.start_at),
            end_date: jstDateOf(e.end_at),
            start_time: jstTimeOf(e.start_at),
            end_time: jstTimeOf(e.end_at),
          }}
        />
      </div>
    </>
  );
}
