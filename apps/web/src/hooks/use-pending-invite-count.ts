"use client";

import { api } from "~/trpc/react";

export function usePendingInviteCount() {
  const groupInvites = api.groups.pendingLookupInvites.useQuery();
  const teamInvites = api.teams.pendingInvites.useQuery();

  const hasError = groupInvites.isError || teamInvites.isError;
  const isLoading = groupInvites.isLoading || teamInvites.isLoading;

  const count =
    (groupInvites.data?.length ?? 0) + (teamInvites.data?.length ?? 0);

  return {
    count,
    isLoading,
    hasError,
    showCount: !hasError && !isLoading && count > 0,
  };
}
