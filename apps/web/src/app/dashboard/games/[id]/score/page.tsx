"use client";

import { use } from "react";

import { FootballScoreEntry } from "~/components/games/football-score-entry";

export default function FootballScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FootballScoreEntry gameId={id} />;
}
