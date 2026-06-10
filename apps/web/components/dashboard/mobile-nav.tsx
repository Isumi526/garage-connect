'use client';

import { logout } from '@/app/(auth)/actions';
import { DashboardNav } from '@/components/dashboard/nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * モバイル(<md)向けのナビ。上部バーのハンバーガーで左からドロワーをスライドイン表示する。
 * デスクトップ(md+)では非表示（既存サイドバーを使う）。中身は DashboardNav を再利用。
 */
export function MobileNav({
  tenantName,
  userLabel,
  pendingBookings,
}: {
  tenantName: string;
  userLabel: string;
  pendingBookings: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ルート遷移したらドロワーを閉じる
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname 変化で閉じるのが目的
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ドロワー表示中は背面スクロールを止める
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* 上部バー（モバイルのみ） */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={open}
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="font-bold">Garage Connect</p>
        <p className="truncate text-sm text-muted-foreground">{tenantName}</p>
      </header>

      {/* オーバーレイ＋ドロワー（常時マウントして transition でスライド） */}
      <div
        className={cn('fixed inset-0 z-40 md:hidden', open ? '' : 'pointer-events-none')}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="メニューを閉じる"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-card p-4 shadow-xl transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="mb-6 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold">Garage Connect</p>
              <p className="truncate text-sm text-muted-foreground">{tenantName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="メニューを閉じる"
              tabIndex={open ? 0 : -1}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <DashboardNav pendingBookings={pendingBookings} />

          <div className="mt-auto space-y-2 border-t pt-4">
            <p className="truncate px-3 text-xs text-muted-foreground">{userLabel}</p>
            <form action={logout}>
              <Button type="submit" variant="ghost" className="w-full justify-start">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
