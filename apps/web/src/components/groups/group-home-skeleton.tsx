import { Skeleton } from "~/components/ui/skeleton";

export function GroupHomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-6">
      <div className="border-rule -mx-4 border-b px-4 pb-5 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="size-11 shrink-0 rounded-md" />
          <Skeleton className="size-11 shrink-0 rounded-md" />
        </div>
        <Skeleton className="mt-5 h-[34px] w-56 max-w-full" />
        <Skeleton className="mt-1 h-[18px] w-64 max-w-full" />
        <Skeleton className="mt-5 h-11 w-full rounded-lg" />
      </div>

      <div className="divide-rule border-rule rounded-card mt-6 divide-y overflow-hidden border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-14 items-center gap-3 px-5 py-4"
          >
            <Skeleton className="h-5 w-6 shrink-0" />
            <Skeleton className="h-5 w-32 max-w-full flex-1" />
            <Skeleton className="h-5 w-12 shrink-0" />
            <Skeleton className="h-5 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
