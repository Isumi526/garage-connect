import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium text-primary">車屋向けマルチテナント業務 SaaS</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Garage Connect</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          ハガキでの車検・点検案内を LINE に置き換える、軽量な顧客接点プラットフォーム。
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={cn(buttonVariants())}>
          ログイン
        </Link>
        <Link href="/signup" className={cn(buttonVariants({ variant: 'outline' }))}>
          新規登録
        </Link>
      </div>
    </main>
  );
}
