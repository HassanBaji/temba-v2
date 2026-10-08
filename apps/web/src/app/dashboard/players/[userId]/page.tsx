"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { PlayerProfile } from "~/components/players/player-profile";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  return (
    <DashboardShell
      title="Player"
      width="content"
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[1000px] lg:mt-2">
        <PlayerProfile userId={userId} />
      </div>
    </DashboardShell>
  );
}
