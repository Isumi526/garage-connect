import { ComingSoon } from '@/components/dashboard/coming-soon';
import { PageHeader } from '@/components/dashboard/page-header';

export default function VehiclesPage() {
  return (
    <>
      <PageHeader title="車両" description="車両の一覧・車検満了日管理" />
      <ComingSoon phase="Phase 2（顧客・車両管理）" />
    </>
  );
}
