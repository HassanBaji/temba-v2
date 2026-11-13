"use client";

import { use } from "react";

import { RateGamePage } from "~/components/games/rate-game-page";

export default function GameRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RateGamePage gameId={id} />;
}
