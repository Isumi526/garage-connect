import { ComingSoon } from '@/components/dashboard/coming-soon';
import { PageHeader } from '@/components/dashboard/page-header';

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="顧客" description="顧客の一覧・登録・編集" />
      <ComingSoon phase="Phase 2（顧客・車両管理）" />
    </>
  );
}
