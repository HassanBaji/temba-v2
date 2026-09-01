import { filterAndSortHomeUpcomingGames } from "~/server/home/upcoming-games";
import { type GroupGameCandidate } from "~/server/groups/utils";

export function filterAndSortGroupUpcomingGames<T extends GroupGameCandidate>(
  games: readonly T[],
  groupId: string,
  now: Date,
): T[] {
  return filterAndSortHomeUpcomingGames(games, new Set([groupId]), now);
}
