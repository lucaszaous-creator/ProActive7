interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
        </div>
      </div>
    </div>
  );
}
