import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string };
}) {
  await requireAuth();
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? '';
  const type = searchParams.type ?? '';

  let query = supabase
    .from('customers')
    .select('id, name, name_kana, customer_type, phone, corporate_name, status')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) {
    // 氏名・フリガナ・電話・法人名の部分一致（RLS で自テナント限定）
    const like = `%${q}%`;
    query = query.or(
      `name.ilike.${like},name_kana.ilike.${like},phone.ilike.${like},corporate_name.ilike.${like}`,
    );
  }
  if (type === 'individual' || type === 'corporate') {
    query = query.eq('customer_type', type);
  }

  const { data: customers } = await query;

  return (
    <>
      <PageHeader
        title="顧客"
        description="顧客の一覧・検索"
        action={
          <Button asChild>
            <Link href="/dashboard/customers/new">新規登録</Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/dashboard/customers">
        <Input
          name="q"
          placeholder="氏名・フリガナ・電話・法人名で検索"
          defaultValue={q}
          className="max-w-xs"
        />
        <select
          name="type"
          defaultValue={type}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">すべての種別</option>
          <option value="individual">個人</option>
          <option value="corporate">法人</option>
        </select>
        <Button type="submit" variant="secondary">
          検索
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/customers/import">CSV インポート</Link>
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {customers && customers.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">氏名</th>
                  <th className="px-4 py-3 font-medium">種別</th>
                  <th className="px-4 py-3 font-medium">電話番号</th>
                  <th className="px-4 py-3 font-medium">状態</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.customer_type === 'corporate' && c.corporate_name
                          ? c.corporate_name
                          : c.name}
                      </Link>
                      {c.name_kana && (
                        <p className="text-xs text-muted-foreground">{c.name_kana}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.customer_type === 'corporate' ? 'secondary' : 'outline'}>
                        {c.customer_type === 'corporate' ? '法人' : '個人'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3">{c.status === 'active' ? '有効' : '無効'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              {q || type ? '該当する顧客がいません' : '顧客がまだ登録されていません'}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
