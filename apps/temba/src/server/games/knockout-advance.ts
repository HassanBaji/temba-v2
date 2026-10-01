import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import {
  MatchStatusEnum,
  TournamentShapeEnum,
  gameTeams,
  games,
  matches,
  matchSets,
} from "@repo/db";

import { knockoutFeeds } from "~/lib/tournament-knockout";
import { KNOCKOUT_DECIDING_SET_COPY } from "~/lib/tournament-knockout-view";
import { type db } from "~/server/db";
import { type GameRow } from "~/server/games/access";
import { computePoolTables } from "~/server/games/pool-table";
import { type MatchRow } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type MatchResult = "slot1" | "slot2" | "draw" | "none";

export const KNOCKOUT_LEVEL_MESSAGE = KNOCKOUT_DECIDING_SET_COPY;
export const KNOCKOUT_EMPTY_SIDE_MESSAGE =
  "This Knockout Match has an empty side. Sets open once both teams are in.";
export const KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE =
  "The Match this result feeds has started, so this result can no longer be reversed";
export const POOL_CORRECTION_REFUSED_MESSAGE =
  "A Knockout Match has started, so this group result can no longer be reversed";

export function isKnockoutMatch(match: Pick<MatchRow, "knockoutRound">) {
  return match.knockoutRound != null;
}

/** A Knockout Match must have a winner: level Sets are no result yet. */
export function knockoutMatchIsLevel(
  match: Pick<MatchRow, "knockoutRound">,
  result: MatchResult,
) {
  return isKnockoutMatch(match) && result === "draw";
}

export function assertKnockoutMatchHasBothSides(
  match: Pick<
    MatchRow,
    "knockoutRound" | "slot1GameTeamId" | "slot2GameTeamId"
  >,
) {
  if (
    isKnockoutMatch(match) &&
    (!match.slot1GameTeamId || !match.slot2GameTeamId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: KNOCKOUT_EMPTY_SIDE_MESSAGE,
    });
  }
}

async function lockFedMatch(database: DbClient, match: MatchRow) {
  if (match.knockoutRound == null || match.knockoutPosition == null) {
    return null;
  }
  const fed = knockoutFeeds(match.knockoutRound, match.knockoutPosition);
  const [row] = await database
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.gameId, match.gameId),
        eq(matches.knockoutRound, fed.round),
        eq(matches.knockoutPosition, fed.position),
      ),
    )
    .for("update");
  return row ? { row, slot: fed.slot } : null;
}

/**
 * Writes a completed Knockout Match's winner into the slot of the Match it
 * feeds. Runs inside the completion transaction, after the Match row lock,
 * so a duplicate completion never reaches it twice. The Final feeds nothing.
 */
export async function advanceKnockoutWinner(
  database: DbClient,
  match: MatchRow,
  result: MatchResult,
) {
  if (result !== "slot1" && result !== "slot2") {
    return;
  }
  const winnerGameTeamId =
    result === "slot1" ? match.slot1GameTeamId : match.slot2GameTeamId;
  const fed = await lockFedMatch(database, match);
  if (!fed || !winnerGameTeamId) {
    return;
  }
  await database
    .update(matches)
    .set(
      fed.slot === 1
        ? { slot1GameTeamId: winnerGameTeamId, updatedAt: new Date() }
        : { slot2GameTeamId: winnerGameTeamId, updatedAt: new Date() },
    )
    .where(eq(matches.id, fed.row.id));
}

/**
 * Takes a reopened Knockout Match's winner back out of the Match it feeds.
 * Refused once that Match has a Set or is settled, so a correction never
 * rewrites a Match already under way.
 */
export async function takeBackKnockoutWinner(
  database: DbClient,
  match: MatchRow,
) {
  const fed = await lockFedMatch(database, match);
  if (!fed) {
    return;
  }
  const settled =
    fed.row.status === MatchStatusEnum.COMPLETED ||
    fed.row.status === MatchStatusEnum.CANCELLED;
  const fedSet = await database.query.matchSets.findFirst({
    where: eq(matchSets.matchId, fed.row.id),
    columns: { id: true },
  });
  if (settled || fedSet) {
    throw new TRPCError({
      code: "CONFLICT",
      message: KNOCKOUT_TAKE_BACK_REFUSED_MESSAGE,
    });
  }
  await database
    .update(matches)
    .set(
      fed.slot === 1
        ? { slot1GameTeamId: null, updatedAt: new Date() }
        : { slot2GameTeamId: null, updatedAt: new Date() },
    )
    .where(eq(matches.id, fed.row.id));
}

type PlacementGame = Pick<
  GameRow,
  "id" | "format" | "poolCount" | "tournamentShape"
>;

function placesQualifiers(
  game: PlacementGame,
  match: Pick<MatchRow, "knockoutRound">,
) {
  return (
    !isKnockoutMatch(match) &&
    game.tournamentShape === TournamentShapeEnum.GROUPS_THEN_KNOCKOUT
  );
}

function isSettled(status: string | null) {
  return (
    status === MatchStatusEnum.COMPLETED || status === MatchStatusEnum.CANCELLED
  );
}

/**
 * Groups then knockout: once every Pool Match is settled, writes each
 * qualifier into the Knockout slot whose stored source names its Pool place.
 * Pool places are read from the Pool tables in their tie-break order, skipping
 * a Game team that left, so the next team goes through instead; a source with
 * no team stays empty. Fills only empty slots, so a repeat run changes
 * nothing. Runs inside the settling transaction, under the Game row lock, so
 * two last Pool Matches settling together still place once.
 */
export async function placeKnockoutQualifiers(
  database: DbClient,
  game: PlacementGame,
  match: Pick<MatchRow, "knockoutRound">,
) {
  if (!placesQualifiers(game, match)) {
    return;
  }
  await database
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, game.id))
    .for("update");

  const matchRows = await database.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    with: {
      sets: {
        columns: { slot1GamesWon: true, slot2GamesWon: true },
        orderBy: asc(matchSets.setNumber),
      },
    },
  });
  const poolMatches = matchRows.filter((row) => !isKnockoutMatch(row));
  if (
    poolMatches.length === 0 ||
    !poolMatches.every((row) => isSettled(row.status))
  ) {
    return;
  }

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: { players: { columns: { id: true } } },
  });
  const tables = computePoolTables({
    format: game.format,
    poolCount: game.poolCount,
    viewerUserId: "",
    gameTeams: teamRows.map((team) => ({
      id: team.id,
      name: team.name,
      sideIndex: team.sideIndex,
      poolIndex: team.poolIndex,
      members: [],
    })),
    matches: matchRows.map((row) => ({
      id: row.id,
      status: row.status,
      roundNumber: row.roundNumber,
      knockoutRound: row.knockoutRound,
      startTime: row.startTime,
      slot1GameTeamId: row.slot1GameTeamId,
      slot2GameTeamId: row.slot2GameTeamId,
      sets: row.sets,
    })),
  });
  if (!tables) {
    return;
  }

  const stillIn = new Set(
    teamRows.filter((team) => team.players.length === 2).map((team) => team.id),
  );
  const qualifierAt = (
    poolIndex: number | null,
    position: number | null,
  ): string | null => {
    if (poolIndex == null || position == null) {
      return null;
    }
    const rows =
      tables.pools
        .find((pool) => pool.poolIndex === poolIndex)
        ?.rows.filter((row) => stillIn.has(row.gameTeamId)) ?? [];
    return rows[position - 1]?.gameTeamId ?? null;
  };

  const now = new Date();
  for (const row of matchRows) {
    if (!isKnockoutMatch(row)) {
      continue;
    }
    const slot1 = row.slot1GameTeamId
      ? null
      : qualifierAt(row.slot1SourcePoolIndex, row.slot1SourcePoolPosition);
    const slot2 = row.slot2GameTeamId
      ? null
      : qualifierAt(row.slot2SourcePoolIndex, row.slot2SourcePoolPosition);
    if (!slot1 && !slot2) {
      continue;
    }
    await database
      .update(matches)
      .set({
        ...(slot1 ? { slot1GameTeamId: slot1 } : {}),
        ...(slot2 ? { slot2GameTeamId: slot2 } : {}),
        updatedAt: now,
      })
      .where(eq(matches.id, row.id));
  }
}

/**
 * A wrong-score reversal on a Pool Match: clears every placed qualifier slot
 * so placement runs again once the Pool stage settles again. Refused once any
 * Knockout Match has a Set, so the tree never changes under a Match that has
 * started.
 */
export async function takeBackKnockoutQualifiers(
  database: DbClient,
  game: PlacementGame,
  match: Pick<MatchRow, "knockoutRound">,
) {
  if (!placesQualifiers(game, match)) {
    return;
  }
  const knockoutRows = await database
    .select()
    .from(matches)
    .where(and(eq(matches.gameId, game.id), isNotNull(matches.knockoutRound)))
    .for("update");
  if (knockoutRows.length === 0) {
    return;
  }
  const knockoutSet = await database.query.matchSets.findFirst({
    where: inArray(
      matchSets.matchId,
      knockoutRows.map((row) => row.id),
    ),
    columns: { id: true },
  });
  if (knockoutSet) {
    throw new TRPCError({
      code: "CONFLICT",
      message: POOL_CORRECTION_REFUSED_MESSAGE,
    });
  }

  const now = new Date();
  for (const row of knockoutRows) {
    const clearSlot1 =
      row.slot1SourcePoolIndex != null && row.slot1GameTeamId != null;
    const clearSlot2 =
      row.slot2SourcePoolIndex != null && row.slot2GameTeamId != null;
    if (!clearSlot1 && !clearSlot2) {
      continue;
    }
    await database
      .update(matches)
      .set({
        ...(clearSlot1 ? { slot1GameTeamId: null } : {}),
        ...(clearSlot2 ? { slot2GameTeamId: null } : {}),
        updatedAt: now,
      })
      .where(eq(matches.id, row.id));
  }
}
