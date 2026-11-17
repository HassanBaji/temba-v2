"use client";

import { use } from "react";

import { AloneShareTeams } from "~/components/share-result/alone-share-teams";

export default function AloneShareTeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AloneShareTeams gameId={id} />;
}
