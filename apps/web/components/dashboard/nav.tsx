'use client';

import { cn } from '@/lib/utils/cn';
import { Bell, Calendar, Car, FileText, LayoutDashboard, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: '顧客', icon: Users },
  { href: '/dashboard/vehicles', label: '車両', icon: Car },
  { href: '/dashboard/notifications', label: '配信ログ', icon: Bell },
  { href: '/dashboard/bookings', label: '予約', icon: Calendar },
  { href: '/dashboard/templates', label: '通知テンプレ', icon: FileText },
  { href: '/dashboard/settings', label: '設定', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
