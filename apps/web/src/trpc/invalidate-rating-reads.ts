import { type api } from "~/trpc/react";

type Utils = ReturnType<typeof api.useUtils>;

/**
 * Every read that shows a Level, an OVR or Tier points. A write that can move
 * one of them calls this, so no screen shows the number from before the write.
 * With a Group id only that Group's Tier reads refetch.
 */
export function invalidateRatingReads(
  utils: Utils,
  scope: { groupId?: string | null } = {},
) {
  const groupId = scope.groupId ?? undefined;
  return Promise.all([
    utils.ratings.me.invalidate(),
    utils.ratings.history.invalidate(),
    utils.ratings.myGroupTiers.invalidate(),
    utils.groups.byId.invalidate(groupId ? { id: groupId } : undefined),
    utils.groups.tierHistory.invalidate(groupId ? { groupId } : undefined),
    utils.users.myProfile.invalidate(),
    utils.users.footballProfile.invalidate(),
    utils.users.playerProfile.invalidate(),
  ]);
}
