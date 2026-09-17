"use client";

import { usePathname } from "next/navigation";

import {
  DetailPageSkeleton,
  ListPageSkeleton,
} from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { titleFromPath } from "~/lib/dashboard-paths";

function isDetailPath(pathname: string) {
  return /\/dashboard\/(groups|communities|teams|venues|games)\/(?!new$)[^/]+/.test(
    pathname,
  );
}

export function DashboardRouteLoading() {
  const pathname = usePathname() ?? "/dashboard";
  const title = titleFromPath(pathname);
  const isSettings = pathname.startsWith("/dashboard/you/settings");

  return (
    <DashboardShell title={title} isSubPage={isSettings}>
      {isDetailPath(pathname) ? <DetailPageSkeleton /> : <ListPageSkeleton />}
    </DashboardShell>
  );
}
