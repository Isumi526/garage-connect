'use client';

import { cn } from '@/lib/utils/cn';
import {
  Bell,
  Calendar,
  CalendarDays,
  Car,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: '顧客', icon: Users },
  { href: '/dashboard/vehicles', label: '車両', icon: Car },
  { href: '/dashboard/notifications', label: '配信ログ', icon: Bell },
  { href: '/dashboard/bookings', label: '予約', icon: Calendar },
  { href: '/dashboard/calendar', label: 'カレンダー', icon: CalendarDays },
  { href: '/dashboard/templates', label: '通知テンプレ', icon: FileText },
  { href: '/dashboard/settings', label: '設定', icon: Settings },
];

export function DashboardNav({ pendingBookings = 0 }: { pendingBookings?: number }) {
  const pathname = usePathname();

  // prefetch は明示せず Next.js の既定（auto）に任せる。各ルートに loading.tsx を
  // 用意したことで、動的ルートでも「loading 境界までのシェル」が事前取得され（DBクエリは
  // 走らせない軽量プリフェッチ）、クリック直後にスケルトンが即出る＝遷移が即始まる。
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
        const badge = item.href === '/dashboard/bookings' && pendingBookings > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {badge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                {pendingBookings}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
