import { redirect } from "next/navigation";

import { friendlyTournamentCreateTarget } from "@repo/domain/create-game-flow";
import { createGameFlowHref } from "~/lib/create-game-flow-href";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string | string[] }>;
}) {
  const params = await searchParams;
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  redirect(createGameFlowHref(friendlyTournamentCreateTarget(groupId)));
}
