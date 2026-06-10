import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 各画面の loading.tsx から使う共通スケルトン。
 * 遷移操作の直後に即時表示され、データ到着までの白画面を防ぐ（遷移体感の改善）。
 * 実際のレイアウト（PageHeader / 検索フォーム / テーブル）に寄せた骨組みにしている。
 */

/** ページ見出し（タイトル＋説明＋右肩のアクションボタン）の骨組み */
export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {withAction && <Skeleton className="h-10 w-28" />}
    </div>
  );
}

/** 検索・フィルタ行の骨組み */
export function FilterBarSkeleton() {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Skeleton className="h-10 w-72 max-w-xs" />
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-10 w-20" />
    </div>
  );
}

/** 一覧テーブルの骨組み（Card に内包された行のリスト） */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            // 静的なスケルトン行のため index キーで問題ない
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 一覧画面（見出し＋検索＋テーブル）の骨組み */
export function ListPageSkeleton({ filter = true, rows = 8 }: { filter?: boolean; rows?: number }) {
  return (
    <>
      <PageHeaderSkeleton />
      {filter && <FilterBarSkeleton />}
      <TableSkeleton rows={rows} />
    </>
  );
}

/** 詳細画面（見出し＋情報カード群）の骨組み */
export function DetailPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards
          <Card key={i}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

/** ダッシュボード（統計カード群）の骨組み */
export function StatsPageSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards
          <Card key={i}>
            <CardContent className="space-y-2 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
