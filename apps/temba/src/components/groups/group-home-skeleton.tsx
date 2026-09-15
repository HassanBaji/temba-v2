import { Skeleton } from "~/components/ui/skeleton";

export function GroupHomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="md:-mt-6 lg:mt-0">
        <div className="flex h-[52px] items-center gap-1 lg:hidden">
          <Skeleton className="size-11 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1" />
          <Skeleton className="size-11 shrink-0 rounded-md" />
        </div>
      </div>

      <div className="border-rule -mx-4 border-b px-4 pb-5 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="size-10 shrink-0 rounded-[10px]" />
          <Skeleton className="size-10 shrink-0 rounded-[10px]" />
        </div>
        <Skeleton className="mt-5 h-[34px] w-56 max-w-full" />
        <Skeleton className="mt-1 h-[18px] w-64 max-w-full" />
        <Skeleton className="mt-5 h-11 w-full rounded-[12px]" />
      </div>

      <div className="divide-rule border-rule mt-6 divide-y overflow-hidden rounded-[14px] border">
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
