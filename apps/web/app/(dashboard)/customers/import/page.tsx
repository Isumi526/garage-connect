import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { ImportForm } from './import-form';

export default async function ImportCustomersPage() {
  await requireAuth();
  return (
    <>
      <PageHeader title="顧客 CSV インポート" description="既存ソフトからの移行用" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>手順</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>テンプレート CSV をダウンロード</li>
              <li>既存データを列に合わせて入力（種別は「個人」または「法人」）</li>
              <li>CSV をアップロードしてインポート</li>
            </ol>
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/customers/import/template">テンプレートをダウンロード</a>
            </Button>
          </CardContent>
        </Card>

        <ImportForm />
      </div>
    </>
  );
}
