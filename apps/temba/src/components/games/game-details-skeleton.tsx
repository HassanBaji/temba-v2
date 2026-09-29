import { Skeleton } from "~/components/ui/skeleton";

export function GameDetailsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading Game</span>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-[248px] w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[104px] rounded-xl" />
            <Skeleton className="h-[104px] rounded-xl" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
