/**
 * Group detail Games lists (TEM-10 / TEM-35).
 * Upcoming: live parent Games scoped to one Group (not Match rows).
 * Soft-archived Club Groups are not filtered here — Group membership / page access decides visibility.
 * History: cancelled, or not live; newest first; capped.
 * Games with null groupId never match a Group id filter.
 */

import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
  isGameLive,
  isHomeUpcomingGame,
  type GameListCandidate,
} from "~/server/home/upcoming-games";

export type GroupGameCandidate = GameListCandidate;

export const GROUP_GAME_HISTORY_LIMIT = 20;

export function isGroupUpcomingGame(
  game: GroupGameCandidate,
  groupId: string,
  now: Date,
): boolean {
  return isHomeUpcomingGame(game, new Set([groupId]), now);
}

export function filterAndSortGroupUpcomingGames<T extends GroupGameCandidate>(
  games: readonly T[],
  groupId: string,
  now: Date,
): T[] {
  return filterAndSortHomeUpcomingGames(games, new Set([groupId]), now);
}

/** Whether a Game row belongs in this Group's history list. */
export function isGroupGameHistory(
  game: GroupGameCandidate,
  groupId: string,
  now: Date,
): boolean {
  if (game.groupId === null || game.groupId !== groupId) {
    return false;
  }
  return !isGameLive(game, now);
}

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
