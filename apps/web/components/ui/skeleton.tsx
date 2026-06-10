import { cn } from '@/lib/utils/cn';

/** ローディング中のプレースホルダ。遷移直後に即表示して「白画面で固まった感」を消す。 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
