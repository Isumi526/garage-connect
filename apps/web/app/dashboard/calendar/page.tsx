import { createEvent, deleteEvent } from '@/app/dashboard/calendar/actions';
import { PageHeader } from '@/components/dashboard/page-header';
import { DeleteButton } from '@/components/shared/delete-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import {
  WEEKDAY_LABELS,
  addMonth,
  datesBetween,
  jstDateOf,
  jstTimeOf,
  monthLabel,
  monthMatrix,
  monthRange,
  parseMonth,
  todayJstDate,
  ym,
} from '@/lib/utils/calendar';
import { EVENT_TYPE_LABEL } from '@/lib/validations/schedule';
import Link from 'next/link';
import { EventForm } from './event-form';

const EVENT_CHIP: Record<string, string> = {
  inspection: 'bg-indigo-100 text-indigo-800',
  maintenance: 'bg-amber-100 text-amber-800',
  visitor: 'bg-purple-100 text-purple-800',
  other: 'bg-slate-100 text-slate-700',
  closure: 'bg-red-100 text-red-800',
  open: 'bg-emerald-100 text-emerald-800',
};

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export default async function CalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  await requireAuth();
  const supabase = createClient();
  const cur = parseMonth(searchParams.m);
  const { start, end } = monthRange(cur);

  const [{ data: hours }, { data: events }, { data: bookings }] = await Promise.all([
    supabase.from('business_hours').select('weekday, is_closed'),
    supabase
      .from('schedule_events')
      .select('id, event_type, title, start_at, end_at, all_day')
      .lte('start_at', `${end}T23:59:59+09:00`)
      .gte('end_at', `${start}T00:00:00+09:00`),
    supabase
      .from('bookings')
      .select('id, preferred_date, preferred_time_slot, status, customer:customers(name)')
      .gte('preferred_date', start)
      .lte('preferred_date', end),
  ]);

  const closed = new Set((hours ?? []).filter((h) => h.is_closed).map((h) => h.weekday));

  const eventsByDate = new Map<string, { id: string; type: string; label: string }[]>();
  for (const e of events ?? []) {
    for (const d of datesBetween(jstDateOf(e.start_at), jstDateOf(e.end_at))) {
      const arr = eventsByDate.get(d) ?? [];
      const time = e.all_day ? '' : `${jstTimeOf(e.start_at)} `;
      arr.push({
        id: e.id,
        type: e.event_type,
        label: `${time}${EVENT_TYPE_LABEL[e.event_type] ?? ''}${e.title ? ` ${e.title}` : ''}`,
      });
      eventsByDate.set(d, arr);
    }
  }

  const bookingsByDate = new Map<string, { id: string; label: string }[]>();
  for (const b of bookings ?? []) {
    const c = Array.isArray(b.customer) ? b.customer[0] : b.customer;
    const arr = bookingsByDate.get(b.preferred_date) ?? [];
    arr.push({ id: b.id, label: `予約 ${c?.name ?? ''}`.trim() });
    bookingsByDate.set(b.preferred_date, arr);
  }

  const weeks = monthMatrix(cur);
  const today = todayJstDate();
  const prev = ym(addMonth(cur, -1));
  const next = ym(addMonth(cur, 1));

  // 今月の予定一覧（編集・削除用）
  const monthEvents = (events ?? [])
    .map((e) => ({
      ...e,
      date: jstDateOf(e.start_at),
      time: e.all_day ? '終日' : `${jstTimeOf(e.start_at)}〜${jstTimeOf(e.end_at)}`,
    }))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  return (
    <>
      <PageHeader
        title="カレンダー"
        description="予約・休業・用事を一覧で管理"
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/calendar?m=${prev}`}>← 前月</Link>
            </Button>
            <span className="min-w-24 text-center text-sm font-medium">{monthLabel(cur)}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/calendar?m=${next}`}>翌月 →</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={w} className={i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}>
                {w}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-px overflow-hidden rounded border bg-border">
            {weeks.flat().map((date, i) => {
              if (!date) {
                // biome-ignore lint/suspicious/noArrayIndexKey: 余白セルは安定要素なし
                return <div key={`b${i}`} className="min-h-20 bg-muted/30" />;
              }
              const wd = weekdayOf(date);
              const isClosed = closed.has(wd);
              const dayNum = Number(date.slice(8, 10));
              const evs = eventsByDate.get(date) ?? [];
              const bks = bookingsByDate.get(date) ?? [];
              return (
                <div
                  key={date}
                  className={`min-h-20 bg-background p-1 text-left ${isClosed ? 'bg-red-50/60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${date === today ? 'rounded bg-primary px-1 font-bold text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      {dayNum}
                    </span>
                    {isClosed && <span className="text-[10px] text-red-500">休</span>}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {bks.slice(0, 2).map((b) => (
                      <Link
                        key={b.id}
                        href={`/dashboard/bookings/${b.id}/edit`}
                        className="block truncate rounded bg-blue-100 px-1 text-[10px] text-blue-800 hover:bg-blue-200"
                      >
                        {b.label}
                      </Link>
                    ))}
                    {evs.slice(0, 2).map((e) => (
                      <Link
                        key={e.id}
                        href={`/dashboard/calendar/${e.id}/edit`}
                        className={`block truncate rounded px-1 text-[10px] hover:opacity-80 ${EVENT_CHIP[e.type] ?? 'bg-slate-100'}`}
                      >
                        {e.label}
                      </Link>
                    ))}
                    {bks.length + evs.length > 4 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{bks.length + evs.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">予定を追加（休業・臨時営業・用事）</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm
              action={createEvent}
              submitLabel="追加する"
              defaults={{ start_date: today }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{monthLabel(cur)}の予定</CardTitle>
          </CardHeader>
          <CardContent>
            {monthEvents.length > 0 ? (
              <ul className="divide-y text-sm">
                {monthEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <span className="font-medium">{e.date}</span>{' '}
                      <span className="text-muted-foreground">{e.time}</span>{' '}
                      <span
                        className={`rounded px-1 text-xs ${EVENT_CHIP[e.event_type] ?? 'bg-slate-100'}`}
                      >
                        {EVENT_TYPE_LABEL[e.event_type]}
                      </span>{' '}
                      {e.title}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/calendar/${e.id}/edit`}>編集</Link>
                      </Button>
                      <DeleteButton action={deleteEvent.bind(null, e.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-muted-foreground">この月の予定はありません</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
