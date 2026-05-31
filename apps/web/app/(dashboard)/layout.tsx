import { logout } from '@/app/(auth)/actions';
import { DashboardNav } from '@/components/dashboard/nav';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/context';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { tenant, shopUser } = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold">Garage Connect</p>
          <p className="truncate text-sm text-muted-foreground">{tenant.name}</p>
        </div>
        <DashboardNav />
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
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
