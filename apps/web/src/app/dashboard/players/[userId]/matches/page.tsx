"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { PlayerMatches } from "~/components/players/player-matches";

export default function PlayerMatchesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const m = useMessages();

  return (
    <DashboardShell title={m.webDashboard.player.lastTenGames} width="content" hidePageHeader>
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[1000px] lg:mt-2">
        <PlayerMatches userId={userId} />
      </div>
    </DashboardShell>
  );
}
