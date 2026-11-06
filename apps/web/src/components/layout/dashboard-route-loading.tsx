"use client";

import { usePathname } from "next/navigation";

import {
  DetailPageSkeleton,
  ListPageSkeleton,
} from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { pageHidesMobileTopBar, titleFromPath } from "~/lib/dashboard-paths";

function isGameDetailPath(pathname: string) {
  return /\/dashboard\/games\/(?!new$)[^/]+$/.test(pathname);
}

function isDetailPath(pathname: string) {
  return /\/dashboard\/(groups|teams|venues|games)\/(?!new$)[^/]+/.test(
    pathname,
  );
}

export function DashboardRouteLoading() {
  const pathname = usePathname() ?? "/dashboard";
  const m = useMessages();
  const title = titleFromPath(pathname, m);
  const isSettings = pathname.startsWith("/dashboard/you/settings");
  const hidesTopBar = pageHidesMobileTopBar(pathname);

  return (
    <DashboardShell
      title={title}
      isSubPage={isSettings}
      hideMobileTopBar={hidesTopBar}
      hidePageHeader={hidesTopBar}
    >
      {isGameDetailPath(pathname) ? (
        <GameDetailsSkeleton />
      ) : isDetailPath(pathname) ? (
        <DetailPageSkeleton />
      ) : (
        <ListPageSkeleton />
      )}
    </DashboardShell>
  );
}
