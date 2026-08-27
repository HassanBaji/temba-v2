/**
 * Home upcoming Games rules (TEM-8):
 * - groupId must be a Group the User belongs to (excludes public pickup / null groupId)
 * - status pending or confirmed
 * - startTime at or after now
 * - soonest first
 * Soft-archived Club Groups are not filtered here — membership alone decides visibility.
 */

export const HOME_UPCOMING_GAME_STATUSES = ["pending", "confirmed"] as const;

export type HomeUpcomingGameStatus =
  (typeof HOME_UPCOMING_GAME_STATUSES)[number];

export type HomeUpcomingGameCandidate = {
  id: string;
  groupId: string | null;
  status: string | null;
  startTime: Date;
};

export function isHomeUpcomingGameStatus(
  status: string | null,
): status is HomeUpcomingGameStatus {
  return status === "pending" || status === "confirmed";
}

/** Whether a Game row belongs on Home for the given membership set and clock. */
export function isHomeUpcomingGame(
  game: HomeUpcomingGameCandidate,
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): boolean {
  if (game.groupId === null) {
    return false;
  }
  if (!memberGroupIds.has(game.groupId)) {
    return false;
  }
  if (!isHomeUpcomingGameStatus(game.status)) {
    return false;
  }
  return game.startTime.getTime() >= now.getTime();
}

export function filterAndSortHomeUpcomingGames<
  T extends HomeUpcomingGameCandidate,
>(games: readonly T[], memberGroupIds: ReadonlySet<string>, now: Date): T[] {
  return games
    .filter((game) => isHomeUpcomingGame(game, memberGroupIds, now))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
