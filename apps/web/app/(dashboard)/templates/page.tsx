import { ComingSoon } from '@/components/dashboard/coming-soon';
import { PageHeader } from '@/components/dashboard/page-header';

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="通知テンプレ" description="LINE 通知メッセージのテンプレート" />
      <ComingSoon phase="Phase 3（LINE 連携 + 通知）" />
    </>
  );
}
