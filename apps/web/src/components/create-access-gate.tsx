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

export function useCreateAccess() {
  const { isLoaded, user } = useUser();
  return {
    isLoaded,
    hasCreateAccess: user?.publicMetadata.groupCreator === true,
  };
}

export function CreateAccessGate({
  children,
  title,
  backHref,
  backLabel,
}: {
  children: ReactNode;
  title: string;
  backHref: string;
  backLabel: string;
}) {
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const m = useMessages();

  if (!isLoaded) {
    return (
      <DashboardShell title={title}>
        <Skeleton className="h-20 w-full" />
      </DashboardShell>
    );
  }

  if (!hasCreateAccess) {
    return (
      <DashboardShell title={title}>
        <EmptyState
          icon={Lock}
          title={m.community.create.notAvailable.title}
          description={m.community.create.notAvailable.description}
          action={
            <Button asChild>
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return children;
}
