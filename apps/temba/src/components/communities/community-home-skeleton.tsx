import { HEADER_BLEED } from "~/components/groups/group-home-chrome";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function CommunityHomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-6">
      <div className={cn("border-rule border-b pb-5", HEADER_BLEED)}>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="size-11 shrink-0 rounded-md" />
          <Skeleton className="size-11 shrink-0 rounded-md" />
        </div>
        <div className="mt-5 flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[34px] w-56 max-w-full" />
            <Skeleton className="mt-2 h-[18px] w-64 max-w-full" />
          </div>
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-lg" />
      </div>

      <div className="divide-rule border-rule mt-6 divide-y overflow-hidden rounded-[14px] border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3.5 px-5 py-[18px]">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-3 w-28 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
