/**
 * Home upcoming Games (parent events, ADR-0008 / TEM-35):
 * - Visible because the User belongs to the Game's Group (excludes groupless
 *   public pickup until registered / waitlisted / organizer in later tickets)
 * - Not cancelled
 * - Still live: window has not ended if set, or a non-completed Match has
 *   start >= now or unset, or an Americano / empty tournament has no
 *   completed-only life
 * Soft-archived Club Group Games still appear here (TEM-43). Public pickup
 * excludes them separately.
 */

export type GameListMatch = {
  startTime: Date | null;
  status: string | null;
};

export type GameListCandidate = {
  id: string;
  groupId: string | null;
  cancelledAt: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  createdAt: Date;
  format: string;
  matches: readonly GameListMatch[];
};

export function gameListTime(game: GameListCandidate): Date {
  if (game.windowStart) {
    return game.windowStart;
  }
  const matchStarts = game.matches
    .map((match) => match.startTime)
    .filter((start): start is Date => start instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());
  return matchStarts[0] ?? game.createdAt;
}

function isMatchLive(match: GameListMatch, now: Date): boolean {
  if (match.status === "completed" || match.status === "cancelled") {
    return false;
  }
  if (match.startTime === null) {
    return true;
  }
  return match.startTime.getTime() >= now.getTime();
}

export function isGameLive(game: GameListCandidate, now: Date): boolean {
  if (game.cancelledAt !== null) {
    return false;
  }
  if (game.windowEnd !== null && game.windowEnd.getTime() >= now.getTime()) {
    return true;
  }
  if (game.matches.some((match) => isMatchLive(match, now))) {
    return true;
  }
  if (game.matches.length === 0) {
    return game.windowEnd === null || game.windowEnd.getTime() >= now.getTime();
  }
  return false;
}

/** Whether a Game row belongs on Home for the given membership set and clock. */
export function isHomeUpcomingGame(
  game: GameListCandidate,
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): boolean {
  if (game.groupId === null) {
    return false;
  }
  if (!memberGroupIds.has(game.groupId)) {
    return false;
  }
  return isGameLive(game, now);
}

export function filterAndSortHomeUpcomingGames<T extends GameListCandidate>(
  games: readonly T[],
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): T[] {
  return games
    .filter((game) => isHomeUpcomingGame(game, memberGroupIds, now))
    .sort((a, b) => gameListTime(a).getTime() - gameListTime(b).getTime());
}

/**
 * Games hub My Groups uses the same membership and live rules as Home
 * upcoming, including Soft-archived Club Group Games. Community membership
 * is not consulted — only the Group id set.
 */
export function isMyGroupsHubGame(
  game: GameListCandidate,
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): boolean {
  return isHomeUpcomingGame(game, memberGroupIds, now);
}

export function filterAndSortMyGroupsHubGames<T extends GameListCandidate>(
  games: readonly T[],
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): T[] {
  return filterAndSortHomeUpcomingGames(games, memberGroupIds, now);
}

export type PublicHubListCandidate = GameListCandidate & {
  isPublic: boolean;
  communityArchivedAt: Date | null;
};

/**
 * Public hub: live `isPublic` Games (groupless allowed). Soft-archived Club
 * Group Games are excluded. Games on Groups the User belongs to are excluded
 * (My preferred).
 */
export function isPublicHubGame(
  game: PublicHubListCandidate,
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): boolean {
  if (!game.isPublic) {
    return false;
  }
  if (game.communityArchivedAt !== null) {
    return false;
  }
  if (game.groupId !== null && memberGroupIds.has(game.groupId)) {
    return false;
  }
  return isGameLive(game, now);
}

export function filterAndSortPublicHubGames<T extends PublicHubListCandidate>(
  games: readonly T[],
  memberGroupIds: ReadonlySet<string>,
  now: Date,
): T[] {
  return games
    .filter((game) => isPublicHubGame(game, memberGroupIds, now))
    .sort((a, b) => gameListTime(a).getTime() - gameListTime(b).getTime());
}
