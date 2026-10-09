"use client";

import { api } from "~/trpc/react";

/** Pending invites across the four kinds that `/dashboard/invites` lists. */
export function useInviteInboxCount() {
  const communityInvites = api.communities.pendingLookupInvites.useQuery();
  const groupInvites = api.groups.pendingLookupInvites.useQuery();
  const teamInvites = api.teams.pendingInvites.useQuery();
  const gameInvites = api.games.pendingLookupInvites.useQuery();

  return (
    (communityInvites.data?.length ?? 0) +
    (groupInvites.data?.length ?? 0) +
    (teamInvites.data?.length ?? 0) +
    (gameInvites.data?.length ?? 0)
  );
}
