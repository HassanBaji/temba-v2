/**
 * Group-home and membership-only Game lists (parent events, ADR-0008 / TEM-35):
 * live, not cancelled, Group id in the caller's membership set. Soft-archived
 * Club Group Games still appear (TEM-43). The Games hub My Games tab also
 * includes Games the User created or is part of — see
 * `isMyGamesHubGame`. Public pickup excludes Soft-archived Club Group Games
 * separately. Home's hero carousel uses `listHomeCarouselGames`, not these
 * hub filters.
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

export type MyGamesHubListCandidate = GameListCandidate & {
  isPublic: boolean;
  createdBy: string;
  viewerIsParticipant: boolean;
};

/**
 * Games hub My Games: live upcoming Games on Groups the User belongs to
 * plus Games they created or are registered/waitlisted on, public or not.
 * Other public Games stay on Public. Sorted soonest start first.
 */
export function isMyGamesHubGame(
  game: MyGamesHubListCandidate,
  memberGroupIds: ReadonlySet<string>,
  userId: string,
  now: Date,
): boolean {
  if (!isGameLive(game, now)) {
    return false;
  }
  if (game.groupId !== null && memberGroupIds.has(game.groupId)) {
    return true;
  }
  return game.createdBy === userId || game.viewerIsParticipant;
}

export function filterAndSortMyGamesHubGames<T extends MyGamesHubListCandidate>(
  games: readonly T[],
  memberGroupIds: ReadonlySet<string>,
  userId: string,
  now: Date,
): T[] {
  return games
    .filter((game) => isMyGamesHubGame(game, memberGroupIds, userId, now))
    .sort((a, b) => gameListTime(a).getTime() - gameListTime(b).getTime());
}

export type PublicHubListCandidate = MyGamesHubListCandidate;

/**
 * Public hub: live `isPublic` Games (groupless allowed) the User may still
 * join. Games already on My Games are excluded (My Games preferred): those on
 * Groups the User belongs to, and those they created or hold a seat or a
 * Waitlist place on.
 */
export function isPublicHubGame(
  game: PublicHubListCandidate,
  memberGroupIds: ReadonlySet<string>,
  userId: string,
  now: Date,
): boolean {
  if (!game.isPublic) {
    return false;
  }
  if (isMyGamesHubGame(game, memberGroupIds, userId, now)) {
    return false;
  }
  return isGameLive(game, now);
}

export function filterAndSortPublicHubGames<T extends PublicHubListCandidate>(
  games: readonly T[],
  memberGroupIds: ReadonlySet<string>,
  userId: string,
  now: Date,
): T[] {
  return games
    .filter((game) => isPublicHubGame(game, memberGroupIds, userId, now))
    .sort((a, b) => gameListTime(a).getTime() - gameListTime(b).getTime());
}
