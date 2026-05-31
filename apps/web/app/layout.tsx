import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Garage Connect',
  description: '車屋の顧客接点を LINE に統一する、軽量マルチテナント SaaS',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
