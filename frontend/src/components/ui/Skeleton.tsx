import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-lg bg-slate-200/70', className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-3 h-7 w-1/3" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
