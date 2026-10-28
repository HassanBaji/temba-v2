"use client";

import { use } from "react";

import { FootballMakeTeams } from "~/components/games/football-make-teams";

export default function FootballMakeTeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FootballMakeTeams gameId={id} />;
}
