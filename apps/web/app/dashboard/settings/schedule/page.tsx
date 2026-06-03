import { PageHeader } from '@/components/dashboard/page-header';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { ScheduleSettingsForm } from './schedule-settings-form';

export default async function ScheduleSettingsPage() {
  const { tenant } = await requireAuth();
  const supabase = createClient();

  const [{ data: hours }, { data: tenantRow }] = await Promise.all([
    supabase
      .from('business_hours')
      .select('weekday, open_time, close_time, is_closed')
      .order('weekday'),
    supabase.from('tenants').select('slot_minutes, slot_capacity').eq('id', tenant.id).single(),
  ]);

  return (
    <>
      <PageHeader title="営業時間・予約枠" description="営業時間・定休日・予約枠の設定" />
      <ScheduleSettingsForm
        hours={hours ?? []}
        slotMinutes={tenantRow?.slot_minutes ?? 30}
        slotCapacity={tenantRow?.slot_capacity ?? 1}
      />
    </>
  );
}
