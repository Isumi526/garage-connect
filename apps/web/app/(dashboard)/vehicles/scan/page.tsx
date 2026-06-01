import { PageHeader } from '@/components/dashboard/page-header';
import { ScanFlow } from '@/components/vehicles/scan-flow';
import { requireAuth } from '@/lib/auth/context';

export default async function VehicleScanPage() {
  await requireAuth();
  return (
    <>
      <PageHeader
        title="車検証QRから登録"
        description="車検証の連結QRをスキャンして顧客と車両を一括登録します"
      />
      <ScanFlow />
    </>
  );
}
