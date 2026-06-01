'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type LiffContext, initLiff } from '@/lib/liff/client';
import { TIME_SLOTS, formatJstDate, timeSlotLabel, todayJst } from '@/lib/utils/timezone';
import { BOOKING_STATUS_LABEL, BOOKING_TYPE_LABEL, bookingTypes } from '@/lib/validations/booking';
import { useCallback, useEffect, useState } from 'react';

type Vehicle = {
  id: string;
  vehicle_name: string | null;
  vehicle_number: string | null;
  inspection_expiry_date: string | null;
};
type Booking = {
  id: string;
  booking_type: string;
  preferred_date: string;
  preferred_time_slot: string | null;
  status: string;
};
type SessionData = {
  status: 'linked' | 'unlinked' | 'no_user';
  tenant?: { name: string };
  customer?: { id: string; name: string };
  vehicles?: Vehicle[];
  bookings?: Booking[];
};

export function BookingApp() {
  const [ctx, setCtx] = useState<LiffContext | null>(null);
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (context: LiffContext) => {
    const res = await fetch('/api/liff/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: context.tenantId,
        accessToken: context.accessToken,
        devUserId: context.devUserId,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? 'セッションの取得に失敗しました');
    }
    setData(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const context = await initLiff();
        setCtx(context);
        if (!context.tenantId) {
          setError('店舗を特定できませんでした。お店から案内された URL を開いてください。');
          return;
        }
        await loadSession(context);
      } catch (e) {
        setError(e instanceof Error ? e.message : '初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSession]);

  if (loading) return <Centered>読み込み中…</Centered>;
  if (error) return <Centered tone="error">{error}</Centered>;
  if (!data || !ctx) return <Centered tone="error">表示できませんでした</Centered>;

  // 概念2: LINE ユーザー未特定（LINE 外で開いた等）
  if (data.status === 'no_user') {
    return (
      <Centered tone="error">
        LINE アプリ内で開いてください。
        <br />
        （ブラウザでは LINE ユーザーを特定できません）
      </Centered>
    );
  }

  // 概念2: 友だち追加済みだが店舗未紐付け
  if (data.status === 'unlinked') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{data.tenant?.name ?? 'お店'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            ご利用には、お客様情報の紐付けが必要です。
            <br />
            お手数ですが、店舗スタッフに以下をお伝えください。
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            <li>このアカウントで友だち追加済みであること</li>
            <li>お名前・お電話番号</li>
          </ul>
          <p className="text-muted-foreground">
            紐付けが完了すると、車検予約やマイページがご利用いただけます。
          </p>
        </CardContent>
      </Card>
    );
  }

  // 紐付け済み：マイページ
  return (
    <LinkedView
      data={data}
      onBooked={() => loadSession(ctx)}
      submitBooking={async (form) => {
        const res = await fetch('/api/liff/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: ctx.tenantId,
            accessToken: ctx.accessToken,
            devUserId: ctx.devUserId,
            ...form,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? '予約に失敗しました');
      }}
    />
  );
}

function LinkedView({
  data,
  onBooked,
  submitBooking,
}: {
  data: SessionData;
  onBooked: () => void;
  submitBooking: (form: Record<string, string>) => Promise<void>;
}) {
  const vehicles = data.vehicles ?? [];
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitBooking({
        vehicle_id: String(fd.get('vehicle_id') ?? ''),
        booking_type: String(fd.get('booking_type') ?? 'inspection'),
        preferred_date: String(fd.get('preferred_date') ?? ''),
        preferred_time_slot: String(fd.get('preferred_time_slot') ?? 'anytime'),
        notes: String(fd.get('notes') ?? ''),
      });
      setDone(true);
      onBooked();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '予約に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">{data.tenant?.name}</p>
        <h1 className="text-xl font-bold">{data.customer?.name} 様 マイページ</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">保有車両</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length > 0 ? (
            <ul className="divide-y text-sm">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2">
                  <span>{v.vehicle_name || v.vehicle_number || '車両'}</span>
                  <span className="text-muted-foreground">
                    {v.inspection_expiry_date
                      ? `車検 ${formatJstDate(v.inspection_expiry_date)}`
                      : '車検満了日 未登録'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">登録された車両がありません</p>
          )}
        </CardContent>
      </Card>

      {done ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="font-semibold text-primary">予約を受け付けました</p>
            <p className="text-sm text-muted-foreground">
              内容を確認のうえ、確定のご連絡をいたします。
            </p>
            <Button variant="outline" onClick={() => setDone(false)}>
              続けて予約する
            </Button>
          </CardContent>
        </Card>
      ) : (
        vehicles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">予約する</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <Field label="車両">
                  <select name="vehicle_id" required className={selectClass}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_name || v.vehicle_number || '車両'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="内容">
                  <select name="booking_type" defaultValue="inspection" className={selectClass}>
                    {bookingTypes.map((t) => (
                      <option key={t} value={t}>
                        {BOOKING_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="希望日">
                  {/* input[type=date] は YYYY-MM-DD 文字列。UTC 変換せず JST のまま送る */}
                  <input
                    type="date"
                    name="preferred_date"
                    required
                    min={todayJst()}
                    className={selectClass}
                  />
                </Field>
                <Field label="時間帯">
                  <select name="preferred_time_slot" defaultValue="anytime" className={selectClass}>
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ご要望（任意）">
                  <Textarea name="notes" rows={3} />
                </Field>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? '送信中…' : 'この内容で予約する'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">予約履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bookings && data.bookings.length > 0 ? (
            <ul className="divide-y text-sm">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <span>
                    {formatJstDate(b.preferred_date)}・{BOOKING_TYPE_LABEL[b.booking_type]}
                    <span className="text-muted-foreground">
                      （{timeSlotLabel(b.preferred_time_slot)}）
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">予約はまだありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Centered({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <p className={tone === 'error' ? 'text-sm text-destructive' : 'text-muted-foreground'}>
        {children}
      </p>
    </div>
  );
}
