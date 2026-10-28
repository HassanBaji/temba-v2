import { and, eq, inArray, ne } from "drizzle-orm";

import { gameTeamPlayers, games, matchResultConfirmations } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";

import { type db } from "#src/db";
import { type MatchRow } from "#src/games/utils";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MatchSlot = 1 | 2;

export type MatchSideSeats = {
  slot: MatchSlot;
  userIds: string[];
  accountHolderIds: string[];
};

/**
 * The seated Users on each of a Match's two Game teams, and which of them
 * have an account. An Unclaimed player never confirms (ADR-0042), so a side
 * whose seated Users are all Unclaimed is confirmed by an Organizer instead.
 */
export async function matchSideSeats(
  database: DbClient,
  match: MatchRow,
): Promise<MatchSideSeats[]> {
  const slots = [
    { slot: 1 as const, gameTeamId: match.slot1GameTeamId },
    { slot: 2 as const, gameTeamId: match.slot2GameTeamId },
  ];
  const slotIds = slots.flatMap((entry) =>
    entry.gameTeamId ? [entry.gameTeamId] : [],
  );
  const links =
    slotIds.length === 0
      ? []
      : await database.query.gameTeamPlayers.findMany({
          where: inArray(gameTeamPlayers.gameTeamId, slotIds),
          columns: { gameTeamId: true },
          with: {
            gamePlayer: {
              columns: { userId: true },
              with: { user: { columns: { clerkId: true, addedAt: true } } },
            },
          },
        });
  return slots.map(({ slot, gameTeamId }) => {
    const userIds = new Set<string>();
    const accountHolderIds = new Set<string>();
    for (const link of links) {
      const { userId, user } = link.gamePlayer;
      if (!gameTeamId || link.gameTeamId !== gameTeamId || !userId) {
        continue;
      }
      userIds.add(userId);
      if (!user || !isUnclaimed(user)) {
        accountHolderIds.add(userId);
      }
    }
    return {
      slot,
      userIds: [...userIds],
      accountHolderIds: [...accountHolderIds],
    };
  });
}

export function sideHasNoAccountHolder(side: MatchSideSeats): boolean {
  return side.userIds.length > 0 && side.accountHolderIds.length === 0;
}

/**
 * The seated User ids with an account on a Match's two Game teams (ADR-0011's
 * "required" confirmers). Unclaimed players are never required.
 */
export async function matchSeatedUserIds(
  database: DbClient,
  match: MatchRow,
): Promise<string[]> {
  const sides = await matchSideSeats(database, match);
  return [...new Set(sides.flatMap((side) => side.accountHolderIds))];
}

/**
 * The sides with no account holder, which an Organizer confirms, and whether
 * that confirmation is recorded yet.
 */
export async function matchOrganizerSides(
  database: DbClient,
  match: MatchRow,
): Promise<{ slot: MatchSlot; confirmed: boolean }[]> {
  const sides = (await matchSideSeats(database, match)).filter(
    sideHasNoAccountHolder,
  );
  if (sides.length === 0) {
    return [];
  }
  const confirmed = new Set(
    await matchResultConfirmedUserIds(database, match.id),
  );
  return sides.map((side) => ({
    slot: side.slot,
    confirmed: side.userIds.some((userId) => confirmed.has(userId)),
  }));
}

/**
 * Records (or refreshes) a seated User's Match result confirmation.
 * Idempotent per Match+User: a duplicate call updates the timestamp rather
 * than inserting a second row.
 */
export async function recordMatchResultConfirmation(
  database: DbClient,
  matchId: string,
  userId: string,
): Promise<void> {
  const now = new Date();
  await database
    .insert(matchResultConfirmations)
    .values({ matchId, userId, confirmedAt: now })
    .onConflictDoUpdate({
      target: [
        matchResultConfirmations.matchId,
        matchResultConfirmations.userId,
      ],
      set: { confirmedAt: now },
    });
}

/**
 * Records an Organizer's confirmation for a side with no account holder, as
 * a confirmation row for each of its seated Unclaimed players, so a changed
 * score clears it like any other.
 */
export async function recordOrganizerSideConfirmation(
  database: DbClient,
  matchId: string,
  side: MatchSideSeats,
): Promise<void> {
  for (const userId of side.userIds) {
    await recordMatchResultConfirmation(database, matchId, userId);
  }
}

/**
 * Clears every Match result confirmation for a Match except the given
 * User's — used when a Set's games-won values change after at least one
 * confirmation already exists (a changed score requires re-agreement).
 */
export async function clearMatchResultConfirmationsExceptUser(
  database: DbClient,
  matchId: string,
  exceptUserId: string,
): Promise<void> {
  await database
    .delete(matchResultConfirmations)
    .where(
      and(
        eq(matchResultConfirmations.matchId, matchId),
        ne(matchResultConfirmations.userId, exceptUserId),
      ),
    );
}

/**
 * Clears every Match result confirmation for a Match — used when a Knockout
 * Match's Sets become level, which is no result to confirm.
 */
export async function clearMatchResultConfirmations(
  database: DbClient,
  matchId: string,
): Promise<void> {
  await database
    .delete(matchResultConfirmations)
    .where(eq(matchResultConfirmations.matchId, matchId));
}

/** The seated User ids who have confirmed a Match's entered result so far. */
export async function matchResultConfirmedUserIds(
  database: DbClient,
  matchId: string,
): Promise<string[]> {
  const confirmations = await database.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
    columns: { userId: true },
  });
  return confirmations.map((row) => row.userId);
}

/**
 * The moment a Match's confirmations were completed: the latest `confirmedAt`
 * among its confirmation rows. `runMatchCompletionEffect` completes and rates
 * a Match in the same transaction as the confirmation that reaches the
 * required count (ADR-0011), so once a Match is `completed`, this timestamp
 * is that completion moment. `null` when the Match has no confirmation rows
 * yet. Read-only additive helper (game-details redesign, TEM-181) — no new
 * table, just an existing column already written by
 * `recordMatchResultConfirmation`.
 */
export async function matchResultConfirmationCompletedAt(
  database: DbClient,
  matchId: string,
): Promise<Date | null> {
  const confirmations = await database.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
    columns: { confirmedAt: true },
  });
  if (confirmations.length === 0) {
    return null;
  }
  return confirmations.reduce<Date>(
    (latest, row) => (row.confirmedAt > latest ? row.confirmedAt : latest),
    confirmations[0]!.confirmedAt,
  );
}

/**
 * The sides of a Match whose players have confirmed its result, by slot.
 * A football Match is agreed once one player from each side confirms; a side
 * with no account holder counts once an Organizer confirms for it.
 */
export async function matchSlotsConfirmed(
  database: DbClient,
  match: MatchRow,
): Promise<{ slot1: boolean; slot2: boolean }> {
  const [sides, confirmedUserIds] = await Promise.all([
    matchSideSeats(database, match),
    matchResultConfirmedUserIds(database, match.id),
  ]);
  const confirmed = new Set(confirmedUserIds);
  const slotConfirmed = (slot: MatchSlot) => {
    const side = sides.find((entry) => entry.slot === slot);
    if (!side) {
      return false;
    }
    const confirmers = sideHasNoAccountHolder(side)
      ? side.userIds
      : side.accountHolderIds;
    return confirmers.some((userId) => confirmed.has(userId));
  };
  return { slot1: slotConfirmed(1), slot2: slotConfirmed(2) };
}

/**
 * Whether the Match's result is agreed: every seated User with an account on
 * a padel Match's two Game teams, or one player from each side of a football
 * Match. A side with no account holder is agreed by an Organizer's
 * confirmation.
 */
export async function matchResultFullyConfirmed(
  database: DbClient,
  match: MatchRow,
): Promise<boolean> {
  const game = await database.query.games.findFirst({
    where: eq(games.id, match.gameId),
    columns: { sport: true },
  });
  if (game && isFootballGame(game)) {
    const sides = await matchSlotsConfirmed(database, match);
    return sides.slot1 && sides.slot2;
  }
  const sides = await matchSideSeats(database, match);
  if (sides.every((side) => side.userIds.length === 0)) {
    return false;
  }
  const confirmedUserIds = new Set(
    await matchResultConfirmedUserIds(database, match.id),
  );
  return sides.every((side) =>
    sideHasNoAccountHolder(side)
      ? side.userIds.some((userId) => confirmedUserIds.has(userId))
      : side.accountHolderIds.every((userId) => confirmedUserIds.has(userId)),
  );
}
