"use client";

import { useMessages } from "~/components/locale-provider";
import { Skeleton } from "~/components/ui/skeleton";

export function AuthLoading({ label }: { label?: string }) {
  const m = useMessages();
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-13 w-full rounded-lg" />
      <Skeleton className="h-13 w-full rounded-lg" />
      <p role="status" className="text-body text-muted-foreground">
        {label ?? m.common.loading}
      </p>
    </div>
  );
}
