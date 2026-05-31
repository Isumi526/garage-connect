import { ComingSoon } from '@/components/dashboard/coming-soon';
import { PageHeader } from '@/components/dashboard/page-header';

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="配信ログ" description="LINE 通知の配信履歴" />
      <ComingSoon phase="Phase 3（LINE 連携 + 通知）" />
    </>
  );
}
