"use client";

import { useUser } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
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
        <EmptyState
          icon={Lock}
          title="Operator access only"
          description="Venue and Court curation is handled by Temba staff."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to Home</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return children;
}
