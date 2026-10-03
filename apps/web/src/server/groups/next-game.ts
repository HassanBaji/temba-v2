/**
 * The soonest upcoming Game per Group, for the Groups list. Reuses the Home
 * upcoming filter so a Group row and Home agree on what counts as upcoming
 * (`.scratch/groups-redesign/spec.md` §6.3). Feed it one batched read across
 * every Group id rather than one read per Group.
 */

import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
  type GameListCandidate,
} from "~/server/home/upcoming-games";

/**
 * Start time of each Group's soonest upcoming Game. Every requested Group id
 * is present, at `null` when the Group has no upcoming Game.
 */
export function nextGameStartTimeByGroup(
  games: readonly GameListCandidate[],
  groupIds: ReadonlySet<string>,
  now: Date,
): Map<string, Date | null> {
  const soonest = new Map<string, Date | null>();
  for (const groupId of groupIds) {
    soonest.set(groupId, null);
  }

  // Sorted soonest first, so the first Game seen for a Group is its next one.
  for (const game of filterAndSortHomeUpcomingGames(games, groupIds, now)) {
    if (game.groupId === null || soonest.get(game.groupId) != null) {
      continue;
    }
    soonest.set(game.groupId, gameListTime(game));
  }

  return soonest;
}
