import { api } from "../trpc/react";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

/** Pending invites across the three kinds the Invites screen lists. */
export function useInviteInboxCount() {
  const group = api.groups.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const team = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const game = api.games.pendingLookupInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  return (
    (group.data?.length ?? 0) +
    (team.data?.length ?? 0) +
    (game.data?.length ?? 0)
  );
}
