import 'server-only';
import { getLineClientForTenant } from '@/lib/line/client';
import type { LineClient } from '@/lib/line/client';
import { applyTemplate, textMessage } from '@/lib/line/messages';
import type { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { type NotifiableVehicle, selectNotificationTargets } from './targets';

export interface RunSummary {
  tenants: number;
  sent: number;
  failed: number;
  skipped: number;
}

type Deps = {
  /** 基準日（既定: 現在） */
  today?: Date;
  /** LINE クライアント生成（テストでモック注入可能） */
  lineClientFactory?: (tenantId: string) => Promise<LineClient>;
};

/**
 * 日次通知バッチの本体。全テナントを走査し、当日の通知対象へ LINE 配信し、
 * notification_logs に記録する。Service Role クライアントを渡すこと。
 */
export async function runDailyNotifications(
  supabase: SupabaseClient<Database>,
  deps: Deps = {},
): Promise<RunSummary> {
  const today = deps.today ?? new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const summary: RunSummary = { tenants: 0, sent: 0, failed: 0, skipped: 0 };

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('status', 'active');

  for (const tenant of tenants ?? []) {
    summary.tenants++;

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select(
        'id, customer_id, vehicle_name, vehicle_number, inspection_expiry_date, liability_insurance_expiry_date, status',
      )
      .eq('tenant_id', tenant.id)
      .eq('status', 'active');

    const targets = selectNotificationTargets((vehicles ?? []) as NotifiableVehicle[], today);
    if (targets.length === 0) continue;

    // テンプレ（trigger_type → body/title）
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('trigger_type, title, body, is_active')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'line');
    const templateByTrigger = new Map(
      (templates ?? []).filter((t) => t.is_active).map((t) => [t.trigger_type, t]),
    );

    let lineClient: LineClient | null = null;
    const getClient = async () => {
      if (!lineClient) {
        lineClient = deps.lineClientFactory
          ? await deps.lineClientFactory(tenant.id)
          : await getLineClientForTenant(supabase, tenant.id);
      }
      return lineClient;
    };

    for (const target of targets) {
      const template = templateByTrigger.get(target.triggerType);
      if (!template) {
        summary.skipped++;
        continue;
      }

      // 当日・同一車両・同一トリガーで送信済みなら重複送信しない
      const { count: already } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('vehicle_id', target.vehicleId)
        .eq('trigger_type', target.triggerType)
        .eq('status', 'sent')
        .gte('sent_at', `${todayStr}T00:00:00`);
      if ((already ?? 0) > 0) {
        summary.skipped++;
        continue;
      }

      // 顧客・LINE 連携を取得
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', target.customerId)
        .single();
      const { data: connection } = await supabase
        .from('line_connections')
        .select('line_user_id, is_blocked')
        .eq('tenant_id', tenant.id)
        .eq('customer_id', target.customerId)
        .maybeSingle();

      const vehicle = (vehicles ?? []).find((v) => v.id === target.vehicleId);
      const baseLog = {
        tenant_id: tenant.id,
        vehicle_id: target.vehicleId,
        customer_id: target.customerId,
        trigger_type: target.triggerType,
        channel: 'line',
      };

      if (!connection || connection.is_blocked || !connection.line_user_id) {
        await supabase.from('notification_logs').insert({
          ...baseLog,
          status: 'skipped',
          error_message: 'LINE 未連携またはブロック',
        });
        summary.skipped++;
        continue;
      }

      const text = applyTemplate(template.body, {
        customer_name: customer?.name,
        vehicle_name: vehicle?.vehicle_name ?? vehicle?.vehicle_number,
        vehicle_number: vehicle?.vehicle_number,
        expiry_date: format(new Date(target.expiryDate), 'yyyy年M月d日'),
        shop_name: tenant.name,
      });

      try {
        const client = await getClient();
        await client.push(connection.line_user_id, [textMessage(text)]);
        await supabase.from('notification_logs').insert({
          ...baseLog,
          recipient: connection.line_user_id,
          status: 'sent',
        });
        summary.sent++;
      } catch (e) {
        await supabase.from('notification_logs').insert({
          ...baseLog,
          recipient: connection.line_user_id,
          status: 'failed',
          error_message: e instanceof Error ? e.message : String(e),
        });
        summary.failed++;
      }
    }
  }

  return summary;
}
