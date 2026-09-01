import { gameListTime } from "~/server/home/upcoming-games";
import { isGroupGameHistory } from "~/server/groups/is-group-game-history";
import { type GroupGameCandidate } from "~/server/groups/utils";

export const GROUP_GAME_HISTORY_LIMIT = 20;

export function filterAndSortGroupGameHistory<T extends GroupGameCandidate>(
  games: readonly T[],
  groupId: string,
  now: Date,
  limit: number = GROUP_GAME_HISTORY_LIMIT,
): T[] {
  return games
    .filter((game) => isGroupGameHistory(game, groupId, now))
    .sort((a, b) => gameListTime(b).getTime() - gameListTime(a).getTime())
    .slice(0, limit);
}
