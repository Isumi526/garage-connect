import { ComingSoon } from '@/components/dashboard/coming-soon';
import { PageHeader } from '@/components/dashboard/page-header';

export default function BookingsPage() {
  return (
    <>
      <PageHeader title="予約" description="顧客からの予約の確認・確定" />
      <ComingSoon phase="Phase 4（LIFF 予約システム）" />
    </>
  );
}
