"use client";

import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { Skeleton } from "~/components/ui/skeleton";

export function OperatorGate({
  children,
  title = "Venues",
}: {
  children: ReactNode;
  title?: string;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <DashboardShell title={title}>
        <Skeleton className="h-20 w-full" />
      </DashboardShell>
    );
  }

  if (user?.publicMetadata.operator !== true) {
    return (
      <DashboardShell title={title}>
        <p className="text-muted-foreground text-sm">
          You do not have access to this area.
        </p>
      </DashboardShell>
    );
  }

  return children;
}
