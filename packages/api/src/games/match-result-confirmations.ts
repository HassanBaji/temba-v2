import { and, eq, inArray, ne } from "drizzle-orm";

import {
  americanoSeats,
  gameTeamPlayers,
  gameTeams,
  games,
  matchResultConfirmations,
  matchVerifierStamps,
} from "@repo/db";

import { isPublicGame } from "@repo/domain/game-rating-scope";
import { isFootballGame } from "@repo/domain/game-shape";

import { type db } from "#src/db";
import { mayHaveAmericanoSeats } from "#src/games/americano-matches";
import { type MatchRow } from "#src/games/utils";
import { type TeamForActing, userActsForTeam } from "#src/teams/acts-for-team";
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
  if (mayHaveAmericanoSeats(match)) {
    const americano = await americanoSideSeats(database, match.id);
    if (americano) {
      return americano;
    }
  }
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

/**
 * An Americano Match's sides, read from its seats: partners change every
 * Round, so the slots hold no Game team (ADR-0094). Null for a Match with no
 * seats.
 */
async function americanoSideSeats(
  database: DbClient,
  matchId: string,
): Promise<MatchSideSeats[] | null> {
  const seats = await database.query.americanoSeats.findMany({
    where: eq(americanoSeats.matchId, matchId),
    columns: { slot: true },
    with: {
      gamePlayer: {
        columns: { userId: true },
        with: { user: { columns: { clerkId: true, addedAt: true } } },
      },
    },
  });
  if (seats.length === 0) {
    return null;
  }
  return ([1, 2] as const).map((slot) => {
    const onSide = seats.filter((seat) => seat.slot === slot);
    const userIds = onSide.flatMap((seat) =>
      seat.gamePlayer.userId ? [seat.gamePlayer.userId] : [],
    );
    const accountHolderIds = onSide.flatMap((seat) =>
      seat.gamePlayer.userId &&
      (!seat.gamePlayer.user || !isUnclaimed(seat.gamePlayer.user))
        ? [seat.gamePlayer.userId]
        : [],
    );
    return { slot, userIds, accountHolderIds };
  });
}

export function sideHasNoAccountHolder(side: MatchSideSeats): boolean {
  return side.userIds.length > 0 && side.accountHolderIds.length === 0;
}

/**
 * The seated User ids with an account on a Match's two Game teams: the
 * players who may confirm, one of whom per side is enough (ADR-0113).
 * Unclaimed players never confirm.
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
 * Records a seated User's agreement with the score as it stands. A repeat
 * keeps the first `confirmedAt`, which is when a tournament score stands from
 * (ADR-0062), so a second tap cannot restart the other team's ten minutes.
 */
export async function keepMatchResultConfirmation(
  database: DbClient,
  matchId: string,
  userId: string,
): Promise<void> {
  await database
    .insert(matchResultConfirmations)
    .values({ matchId, userId, confirmedAt: new Date() })
    .onConflictDoNothing({
      target: [
        matchResultConfirmations.matchId,
        matchResultConfirmations.userId,
      ],
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
 * among its confirmation rows and its Verifier stamp.
 * `runMatchCompletionEffect` completes and rates a Match in the same
 * transaction as the confirmation that reaches the required count
 * (ADR-0011), so once a Match is `completed`, this timestamp is that
 * completion moment. `null` when the Match has no confirmation rows
 * yet. Read-only additive helper (game-details redesign, TEM-181) — no new
 * table, just an existing column already written by
 * `recordMatchResultConfirmation`.
 */
export async function matchResultConfirmationCompletedAt(
  database: DbClient,
  matchId: string,
): Promise<Date | null> {
  const [confirmations, stamp] = await Promise.all([
    database.query.matchResultConfirmations.findMany({
      where: eq(matchResultConfirmations.matchId, matchId),
      columns: { confirmedAt: true },
    }),
    matchVerifierStampOf(database, matchId),
  ]);
  const moments = [
    ...confirmations.map((row) => row.confirmedAt),
    ...(stamp ? [stamp.createdAt] : []),
  ];
  if (moments.length === 0) {
    return null;
  }
  return moments.reduce<Date>(
    (latest, moment) => (moment > latest ? moment : latest),
    moments[0]!,
  );
}

/** A Match's Verifier stamp (ADR-0072), or `null` while it has none. */
export async function matchVerifierStampOf(
  database: DbClient,
  matchId: string,
) {
  const stamp = await database.query.matchVerifierStamps.findFirst({
    where: eq(matchVerifierStamps.matchId, matchId),
  });
  return stamp ?? null;
}

/**
 * Removes a Match's Verifier stamp: the stamp vouched for one score, so a
 * Match reopened for a corrected score needs a new one.
 */
export async function clearMatchVerifierStamp(
  database: DbClient,
  matchId: string,
): Promise<void> {
  await database
    .delete(matchVerifierStamps)
    .where(eq(matchVerifierStamps.matchId, matchId));
}

type ChallengeSideTeam = { slot: MatchSlot; team: TeamForActing };

/** The Team bound to each side of a football Challenge Game's Match. */
async function challengeSideTeams(
  database: DbClient,
  match: MatchRow,
): Promise<ChallengeSideTeam[]> {
  const game = await database.query.games.findFirst({
    where: eq(games.id, match.gameId),
    columns: { sport: true, challengeId: true },
  });
  if (!game?.challengeId || !isFootballGame(game)) {
    return [];
  }
  const slots = [
    { slot: 1 as const, gameTeamId: match.slot1GameTeamId },
    { slot: 2 as const, gameTeamId: match.slot2GameTeamId },
  ];
  const gameTeamIds = slots.flatMap((entry) =>
    entry.gameTeamId ? [entry.gameTeamId] : [],
  );
  if (gameTeamIds.length === 0) {
    return [];
  }
  const rows = await database.query.gameTeams.findMany({
    where: inArray(gameTeams.id, gameTeamIds),
    columns: { id: true },
    with: {
      team: {
        columns: { id: true, sport: true, createdBy: true, groupId: true },
      },
    },
  });
  return slots.flatMap(({ slot, gameTeamId }) => {
    const team = rows.find((row) => row.id === gameTeamId)?.team;
    return team ? [{ slot, team }] : [];
  });
}

async function slotsActedFor(
  database: DbClient,
  teamSides: readonly ChallengeSideTeam[],
  userId: string,
): Promise<MatchSlot[]> {
  const captained = teamSides.filter((side) => side.team.createdBy === userId);
  if (captained.length === 1) {
    return captained.map((side) => side.slot);
  }
  const slots: MatchSlot[] = [];
  for (const side of teamSides) {
    if (await userActsForTeam(database, side.team, userId)) {
      slots.push(side.slot);
    }
  }
  return slots;
}

/**
 * The sides of a football Challenge Game's Match a User who is not named to
 * either squad confirms for: the Team they captain, else every Team they act
 * for as an Organizer of its tagged Group. That is both sides only for an
 * Organizer of a Group both Teams are tagged to, whose one confirmation still
 * counts for one side (`matchSlotsConfirmed`).
 */
export async function matchSlotsActedFor(
  database: DbClient,
  match: MatchRow,
  userId: string,
): Promise<MatchSlot[]> {
  return slotsActedFor(
    database,
    await challengeSideTeams(database, match),
    userId,
  );
}

/**
 * The sides of a Match whose players have confirmed its result, by slot.
 * A Match is agreed once one player from each side confirms; a side
 * with no account holder counts once an Organizer confirms for it. On a
 * football Challenge Game a side also counts once someone who acts for its
 * Team confirms, and one User's confirmation counts for one side only, so
 * the Match needs two Users, one for each Team (ADR-0069): a named player
 * for their own side, anyone else for the Team they captain or the one Team
 * they act for. Someone who acts for both Teams counts for the first side
 * nobody else has confirmed.
 */
export async function matchSlotsConfirmed(
  database: DbClient,
  match: MatchRow,
): Promise<{ slot1: boolean; slot2: boolean }> {
  const [sides, confirmedUserIds, teamSides] = await Promise.all([
    matchSideSeats(database, match),
    matchResultConfirmedUserIds(database, match.id),
    challengeSideTeams(database, match),
  ]);
  const confirmed = new Set(confirmedUserIds);
  const seatedConfirmed = (slot: MatchSlot) => {
    const side = sides.find((entry) => entry.slot === slot);
    if (!side) {
      return false;
    }
    const confirmers = sideHasNoAccountHolder(side)
      ? side.userIds
      : side.accountHolderIds;
    return confirmers.some((userId) => confirmed.has(userId));
  };
  const agreed = { slot1: seatedConfirmed(1), slot2: seatedConfirmed(2) };
  if (teamSides.length === 0) {
    return agreed;
  }
  const agree = (slot: MatchSlot) => {
    agreed[slot === 1 ? "slot1" : "slot2"] = true;
  };
  let actingForBoth = 0;
  for (const userId of confirmed) {
    if (sides.some((side) => side.userIds.includes(userId))) {
      continue;
    }
    const [slot, other] = await slotsActedFor(database, teamSides, userId);
    if (other) {
      actingForBoth += 1;
    } else if (slot) {
      agree(slot);
    }
  }
  for (; actingForBoth > 0; actingForBoth -= 1) {
    agree(agreed.slot1 ? 2 : 1);
  }
  return agreed;
}

/**
 * Whether the Match's result is agreed: one player with an account from each
 * side (ADR-0113). A side with no account holder is agreed by an Organizer's
 * confirmation. A Verifier stamp is a final confirmation on its own
 * (ADR-0072).
 */
export async function matchResultFullyConfirmed(
  database: DbClient,
  match: MatchRow,
): Promise<boolean> {
  if (await matchVerifierStampOf(database, match.id)) {
    return true;
  }
  const sides = await matchSlotsConfirmed(database, match);
  return sides.slot1 && sides.slot2;
}

export const PUBLIC_GAME_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * When a Public Game's entered score stands unconfirmed: 24 hours after it
 * was entered (ADR-0071). A changed score keeps only its enterer's
 * confirmation, so the earliest one left is the entry. `null` while the
 * Match has no confirmation.
 */
export async function publicGameConfirmWindowClosesAt(
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
  const enteredAt = Math.min(
    ...confirmations.map((row) => row.confirmedAt.getTime()),
  );
  return new Date(enteredAt + PUBLIC_GAME_CONFIRM_WINDOW_MS);
}

/** Whether a Public Game's 24 hours to confirm its entered score have run out. */
export async function publicGameConfirmWindowClosed(
  database: DbClient,
  game: { isPublic?: boolean | null; groupId: string | null },
  matchId: string,
  now: Date,
): Promise<boolean> {
  if (!isPublicGame(game)) {
    return false;
  }
  const closesAt = await publicGameConfirmWindowClosesAt(database, matchId);
  return closesAt != null && closesAt.getTime() <= now.getTime();
}
