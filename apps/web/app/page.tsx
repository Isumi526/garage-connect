import { buttonVariants } from '@/components/ui/button';
import { PLANS } from '@/lib/billing/plans';
import { cn } from '@/lib/utils/cn';
import { Bell, Car, QrCode, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: Bell,
    title: '車検・点検の自動 LINE 通知',
    desc: '満了日の 60/45/30 日前に、テンプレートからパーソナライズした通知を自動配信。',
  },
  {
    icon: QrCode,
    title: '車検証 QR で一括登録',
    desc: '車検証の二次元コードをスキャンするだけで、顧客と車両を一発登録。',
  },
  {
    icon: Car,
    title: 'LIFF でワンタップ予約',
    desc: '顧客は LINE から車検・点検をその場で予約。マイページで車検満了日も確認。',
  },
  {
    icon: ShieldCheck,
    title: '安全なマルチテナント',
    desc: 'Row Level Security でテナント分離。Channel Token は暗号化して保管。',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold">Garage Connect</span>
        <div className="flex gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            ログイン
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            無料で始める
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-sm font-medium text-primary">車屋向けマルチテナント業務 SaaS</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            ハガキ案内を、
            <br />
            LINE に置き換える。
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            車検・点検の案内を LINE で自動配信。予約・履歴閲覧まで LINE で完結する、
            軽量な顧客接点プラットフォーム。月額 ¥3,000、初期費用なし。
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
              30 日間無料で試す
            </Link>
            <Link
              href="#pricing"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              料金を見る
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/30 py-16">
          <div className="mx-auto grid max-w-4xl gap-6 px-6 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-lg border bg-card p-6">
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold">料金プラン</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {Object.values(PLANS).map((p) => (
              <div
                key={p.id}
                className={cn(
                  'rounded-lg border bg-card p-6 text-center',
                  p.id === 'standard' && 'border-primary ring-1 ring-primary',
                )}
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {p.priceJpy === 0 ? '¥0' : `¥${p.priceJpy.toLocaleString()}`}
                  {p.priceJpy > 0 && <span className="text-sm font-normal">/月</span>}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.customerLimit === null ? '顧客無制限' : `顧客 ${p.customerLimit} 件まで`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
              無料で始める
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© 2026 Garage Connect</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:underline">
              プライバシーポリシー
            </Link>
            <Link href="/tokushoho" className="hover:underline">
              特定商取引法
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
