import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { InviteForm } from './invite-form';

const ROLE_LABEL: Record<string, string> = {
  owner: 'オーナー',
  admin: '管理者',
  staff: 'スタッフ',
};

export default async function SettingsPage() {
  const { tenant, shopUser } = await requireAuth();
  const supabase = createClient();

  // RLS により自テナントのメンバーのみ取得
  const { data: members } = await supabase
    .from('shop_users')
    .select('id, email, display_name, role, created_at')
    .order('created_at', { ascending: true });

  const canInvite = ['owner', 'admin'].includes(shopUser.role);

  return (
    <>
      <PageHeader title="設定" description="店舗情報・メンバー管理" />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>LINE 連携</CardTitle>
              <CardDescription>公式アカウントの接続・友だち紐付け</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/line">LINE 設定へ</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>営業時間・予約枠</CardTitle>
              <CardDescription>営業時間・定休日・予約枠の設定</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/schedule">スケジュール設定へ</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>プラン・お支払い</CardTitle>
              <CardDescription>ご利用プランの確認・アップグレード</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/billing">プラン設定へ</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>店舗情報</CardTitle>
            <CardDescription>基本情報（編集は今後対応）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">店舗名</span>
              <span className="font-medium">{tenant.name}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">URL 識別子</span>
              <span className="font-medium">{tenant.slug}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">ステータス</span>
              <span className="font-medium">{tenant.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>メンバー（{members?.length ?? 0}）</CardTitle>
            <CardDescription>このテナントに所属する店舗ユーザー</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {members?.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{m.display_name ?? m.email}</p>
                    <p className="text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {canInvite && (
          <Card>
            <CardHeader>
              <CardTitle>メンバーを招待</CardTitle>
              <CardDescription>
                招待されたメンバーはこのテナントに参加します（メールのリンクから登録）。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
