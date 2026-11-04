"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { PlayerProfile } from "~/components/players/player-profile";

export default function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const { userId } = use(params);
  const { sport } = use(searchParams);
  const m = useMessages();

  return (
    <DashboardShell
      title={m.webDashboard.meta.player}
      width="content"
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[1000px] lg:mt-2">
        <PlayerProfile userId={userId} requestedSport={sport} />
      </div>
    </DashboardShell>
  );
}
