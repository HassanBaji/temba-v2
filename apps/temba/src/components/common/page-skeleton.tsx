import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function ListPageSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "divide-border overflow-hidden rounded-lg border",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex min-h-16 items-center gap-3 px-4 py-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn("space-y-6", className)}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-4 w-32 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <ListPageSkeleton />
    </div>
  );
}
