"use client";

import { api } from "~/trpc/react";

export function usePendingInviteCount() {
  const communityInvites = api.communities.pendingLookupInvites.useQuery();
  const groupInvites = api.groups.pendingLookupInvites.useQuery();
  const teamInvites = api.teams.pendingInvites.useQuery();

  const hasError =
    communityInvites.isError || groupInvites.isError || teamInvites.isError;
  const isLoading =
    communityInvites.isLoading ||
    groupInvites.isLoading ||
    teamInvites.isLoading;

  const count =
    (communityInvites.data?.length ?? 0) +
    (groupInvites.data?.length ?? 0) +
    (teamInvites.data?.length ?? 0);

  return {
    count,
    isLoading,
    hasError,
    showCount: !hasError && !isLoading && count > 0,
  };
}
