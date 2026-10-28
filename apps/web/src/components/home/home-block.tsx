import { ErrorState } from "~/components/common/error-state";
import { Skeleton } from "~/components/ui/skeleton";

import type { Slot } from "./home-model";

export function HomeBlock<T>({
  slot,
  title,
  skeletonHeight,
  onRetry,
  children,
}: {
  slot: Slot<T>;
  title: string;
  skeletonHeight: number;
  onRetry: () => void;
  children: (value: T) => React.ReactNode;
}) {
  if (slot.status === "loading") {
    return (
      <Skeleton
        aria-busy="true"
        className="w-full rounded-xl"
        style={{ height: skeletonHeight }}
      />
    );
  }
  if (slot.status === "error") {
    return (
      <ErrorState
        variant="inline"
        title={`${title} could not be loaded`}
        message={slot.message}
        onRetry={onRetry}
      />
    );
  }
  return <>{children(slot.value)}</>;
}
