"use client";

import { useUser } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export function OperatorGate({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const { isLoaded, user } = useUser();
  const m = useMessages();
  const shellTitle = title ?? m.webUi.nav.venues;

  if (!isLoaded) {
    return (
      <DashboardShell title={shellTitle}>
        <Skeleton className="h-20 w-full" />
      </DashboardShell>
    );
  }

  if (user?.publicMetadata.operator !== true) {
    return (
      <DashboardShell title={shellTitle}>
        <EmptyState
          icon={Lock}
          title={m.webUi.operatorGate.title}
          description={m.webUi.operatorGate.description}
          action={
            <Button asChild>
              <Link href="/dashboard">{m.webUi.operatorGate.backHome}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return children;
}
