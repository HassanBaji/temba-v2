import { Skeleton } from "~/components/ui/skeleton";

export function GroupHomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <div className="flex h-[52px] items-center gap-1 lg:hidden">
        <Skeleton className="size-11 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1" />
        <Skeleton className="size-11 shrink-0 rounded-md" />
      </div>

      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="hidden size-11 shrink-0 rounded-md lg:block" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-40 max-w-full" />
        <div className="grid grid-cols-3 divide-x overflow-hidden rounded-xl">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-11 min-h-11 flex-1" />
        <Skeleton className="h-11 min-h-11 flex-1" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>

      <div className="divide-border overflow-hidden rounded-lg border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 px-4 py-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
