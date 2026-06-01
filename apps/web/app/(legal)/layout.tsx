import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Garage Connect トップ
        </Link>
      </header>
      <article className="prose-sm space-y-4 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_li]:text-sm [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </article>
      <footer className="mt-12 flex gap-4 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="hover:underline">
          利用規約
        </Link>
        <Link href="/privacy" className="hover:underline">
          プライバシーポリシー
        </Link>
        <Link href="/tokushoho" className="hover:underline">
          特定商取引法
        </Link>
      </footer>
    </div>
  );
}
