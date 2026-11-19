"use client";

import { use } from "react";

import { AloneMakeTeams } from "~/components/games/alone-make-teams";

export default function AloneMakeTeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AloneMakeTeams gameId={id} />;
}
