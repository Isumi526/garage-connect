import { PageHeader } from '@/components/dashboard/page-header';
import { ScanFlow } from '@/components/vehicles/scan-flow';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';

export default async function VehicleScanPage() {
  await requireAuth();
  const supabase = createClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, corporate_name, customer_type')
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="車検証から登録"
        description="車検証の画像/PDFをアップロードしてOCRで読み取り、顧客と車両を登録します"
      />
      <ScanFlow customers={customers ?? []} />
    </>
  );
}
