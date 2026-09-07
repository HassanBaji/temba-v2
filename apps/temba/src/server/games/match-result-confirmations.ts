import { and, eq, inArray, ne } from "drizzle-orm";

import { gameTeamPlayers, matchResultConfirmations } from "@repo/db";

import { type db } from "~/server/db";
import { type MatchRow } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The seated User ids on a Match's two Game teams (ADR-0011's "required"
 * confirmers). Always four for a scorable Friendly Match, since scoring is
 * already gated on both slotted Game teams being complete.
 */
export async function matchSeatedUserIds(
  database: DbClient,
  match: MatchRow,
): Promise<string[]> {
  const slotIds = [match.slot1GameTeamId, match.slot2GameTeamId].filter(
    (id): id is string => Boolean(id),
  );
  if (slotIds.length === 0) {
    return [];
  }
  const links = await database.query.gameTeamPlayers.findMany({
    where: inArray(gameTeamPlayers.gameTeamId, slotIds),
    columns: {},
    with: {
      gamePlayer: { columns: { userId: true } },
    },
  });
  const userIds = links
    .map((link) => link.gamePlayer.userId)
    .filter((userId): userId is string => Boolean(userId));
  return [...new Set(userIds)];
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
      target: [matchResultConfirmations.matchId, matchResultConfirmations.userId],
      set: { confirmedAt: now },
    });
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
  const confirmations = await database.query.matchResultConfirmations.findMany(
    {
      where: eq(matchResultConfirmations.matchId, matchId),
      columns: { confirmedAt: true },
    },
  );
  if (confirmations.length === 0) {
    return null;
  }
  return confirmations.reduce<Date>(
    (latest, row) => (row.confirmedAt > latest ? row.confirmedAt : latest),
    confirmations[0]!.confirmedAt,
  );
}

/** Whether every seated User on the Match's two Game teams has confirmed. */
export async function matchResultFullyConfirmed(
  database: DbClient,
  match: MatchRow,
): Promise<boolean> {
  const seatedUserIds = await matchSeatedUserIds(database, match);
  if (seatedUserIds.length === 0) {
    return false;
  }
  const confirmations = await database.query.matchResultConfirmations.findMany(
    {
      where: eq(matchResultConfirmations.matchId, match.id),
      columns: { userId: true },
    },
  );
  const confirmedUserIds = new Set(confirmations.map((row) => row.userId));
  return seatedUserIds.every((userId) => confirmedUserIds.has(userId));
}
