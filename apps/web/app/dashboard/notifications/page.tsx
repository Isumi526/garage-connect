import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { RunButton } from './run-button';

const TRIGGER_LABEL: Record<string, string> = {
  inspection_expiry: '車検満了',
  inspection_12month: '12ヶ月点検',
  liability_insurance_expiry: '自賠責満了',
};

const STATUS: Record<string, { label: string; variant: 'success' | 'destructive' | 'secondary' }> =
  {
    sent: { label: '送信済み', variant: 'success' },
    failed: { label: '失敗', variant: 'destructive' },
    skipped: { label: 'スキップ', variant: 'secondary' },
  };

export default async function NotificationsPage() {
  await requireAuth();
  const supabase = createClient();
  const { data: logs } = await supabase
    .from('notification_logs')
    .select(
      'id, trigger_type, channel, status, recipient, error_message, sent_at, customer:customers(name)',
    )
    .order('sent_at', { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="配信ログ" description="LINE 通知の配信履歴" action={<RunButton />} />
      <Card>
        <CardContent className="p-0">
          {logs && logs.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">日時</th>
                  <th className="px-4 py-3 font-medium">顧客</th>
                  <th className="px-4 py-3 font-medium">種別</th>
                  <th className="px-4 py-3 font-medium">状態</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const customer = Array.isArray(log.customer) ? log.customer[0] : log.customer;
                  const st = STATUS[log.status] ?? {
                    label: log.status,
                    variant: 'secondary' as const,
                  };
                  return (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(log.sent_at), 'yyyy/MM/dd HH:mm')}
                      </td>
                      <td className="px-4 py-3">{customer?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {TRIGGER_LABEL[log.trigger_type] ?? log.trigger_type}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {log.error_message && (
                          <p className="mt-1 text-xs text-muted-foreground">{log.error_message}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="py-12 text-center text-muted-foreground">配信ログがまだありません</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
