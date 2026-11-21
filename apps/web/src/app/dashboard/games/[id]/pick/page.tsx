"use client";

import { use } from "react";

import { FootballPickRoom } from "~/components/games/football-pick-room";

export default function PickRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FootballPickRoom gameId={id} />;
}
