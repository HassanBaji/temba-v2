/**
 * Group detail Games lists (TEM-10).
 * Upcoming: same pending/confirmed + startTime >= now rules as Home, scoped to one Group.
 * Soft-archived Club Groups are not filtered here — Group membership / page access decides visibility.
 * History: startTime before now, or status completed/cancelled; newest first; capped.
 * Games with null groupId never match a Group id filter.
 */

import {
  HOME_UPCOMING_GAME_STATUSES,
  filterAndSortHomeUpcomingGames,
  isHomeUpcomingGame,
  type HomeUpcomingGameCandidate,
} from "~/server/home/upcoming-games";

export { HOME_UPCOMING_GAME_STATUSES };

export const GROUP_GAME_HISTORY_STATUSES = ["completed", "cancelled"] as const;

export type GroupGameHistoryStatus =
  (typeof GROUP_GAME_HISTORY_STATUSES)[number];

export const GROUP_GAME_HISTORY_LIMIT = 20;

export type GroupGameCandidate = HomeUpcomingGameCandidate;

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

export function isGroupGameHistoryStatus(
  status: string | null,
): status is GroupGameHistoryStatus {
  return status === "completed" || status === "cancelled";
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
  if (isGroupGameHistoryStatus(game.status)) {
    return true;
  }
  return game.startTime.getTime() < now.getTime();
}

export function filterAndSortGroupGameHistory<T extends GroupGameCandidate>(
  games: readonly T[],
  groupId: string,
  now: Date,
  limit: number = GROUP_GAME_HISTORY_LIMIT,
): T[] {
  return games
    .filter((game) => isGroupGameHistory(game, groupId, now))
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, limit);
}
