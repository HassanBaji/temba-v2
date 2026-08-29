"use client";

import { usePathname } from "next/navigation";

import {
  DetailPageSkeleton,
  ListPageSkeleton,
} from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";

function isDetailPath(pathname: string) {
  return /\/dashboard\/(groups|communities|teams|venues|games)\/(?!new$)[^/]+/.test(
    pathname,
  );
}

function titleFromPath(pathname: string) {
  if (pathname === "/dashboard") {
    return "Home";
  }
  if (pathname.startsWith("/dashboard/you")) {
    return "You";
  }
  if (pathname.startsWith("/dashboard/invites")) {
    return "Invites";
  }
  if (pathname.startsWith("/dashboard/groups/new")) {
    return "Create Group";
  }
  if (pathname.startsWith("/dashboard/communities/new")) {
    return "Create Community";
  }
  if (pathname.startsWith("/dashboard/teams/new")) {
    return "Create Team";
  }
  if (pathname.startsWith("/dashboard/venues/new")) {
    return "Create Venue";
  }
  if (pathname.startsWith("/dashboard/games/new")) {
    return "Create Game";
  }
  if (pathname.startsWith("/dashboard/groups/")) {
    return "Group";
  }
  if (pathname.startsWith("/dashboard/communities/")) {
    return "Community";
  }
  if (pathname.startsWith("/dashboard/teams/")) {
    return "Team";
  }
  if (pathname.startsWith("/dashboard/venues/")) {
    return "Venue";
  }
  if (pathname.startsWith("/dashboard/games/")) {
    return "Game";
  }
  if (pathname.startsWith("/dashboard/groups")) {
    return "Groups";
  }
  if (pathname.startsWith("/dashboard/communities")) {
    return "Communities";
  }
  if (pathname.startsWith("/dashboard/teams")) {
    return "My Teams";
  }
  if (pathname.startsWith("/dashboard/venues")) {
    return "Venues";
  }
  if (pathname.startsWith("/dashboard/games")) {
    return "Games";
  }
  return "Home";
}

export function DashboardRouteLoading() {
  const pathname = usePathname() ?? "/dashboard";
  const title = titleFromPath(pathname);

  return (
    <DashboardShell title={title}>
      {isDetailPath(pathname) ? <DetailPageSkeleton /> : <ListPageSkeleton />}
    </DashboardShell>
  );
}
