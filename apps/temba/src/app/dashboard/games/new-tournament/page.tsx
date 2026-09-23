import { redirect } from "next/navigation";

import { friendlyTournamentCreateHref } from "~/lib/create-game-flow";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string | string[] }>;
}) {
  const params = await searchParams;
  const groupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  redirect(friendlyTournamentCreateHref(groupId));
}
