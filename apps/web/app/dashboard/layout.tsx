import { logout } from '@/app/(auth)/actions';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { DashboardNav } from '@/components/dashboard/nav';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { tenant, shopUser } = await requireAuth();

  // 未確認予約バッジ（顧客→店舗の通知は MVP ではこのバッジで代替）
  const supabase = createClient();
  const { count: pendingBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card p-4 md:flex print:hidden">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold">Garage Connect</p>
          <p className="truncate text-sm text-muted-foreground">{tenant.name}</p>
        </div>
        <DashboardNav pendingBookings={pendingBookings ?? 0} />
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">
            {shopUser.display_name}（{shopUser.role}）
          </p>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              ログアウト
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-muted/20">
        <MobileNav
          tenantName={tenant.name}
          userLabel={`${shopUser.display_name ?? ''}（${shopUser.role}）`}
          pendingBookings={pendingBookings ?? 0}
        />
        <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
