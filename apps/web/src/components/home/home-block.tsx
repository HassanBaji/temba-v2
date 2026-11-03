import { ErrorState } from "~/components/common/error-state";
import { useMessages } from "~/components/locale-provider";
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
  const m = useMessages();
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
        title={m.webAuth.home.couldNotLoad(title)}
        message={slot.message}
        onRetry={onRetry}
      />
    );
  }
  return <>{children(slot.value)}</>;
}
