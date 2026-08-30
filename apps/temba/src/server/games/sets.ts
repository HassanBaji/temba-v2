import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  matchSets,
  matches,
} from "@repo/db";

import { type db } from "~/server/db";
import { type GameRow } from "~/server/games/access";
import { applyRatedMatch } from "~/server/ratings/apply-rated-match";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;
type MatchRow = typeof matches.$inferSelect;
type SetRow = typeof matchSets.$inferSelect;

export function setWinsForGames(
  slot1GamesWon: number | null,
  slot2GamesWon: number | null,
): { slot1SetWins: number; slot2SetWins: number } | null {
  if (slot1GamesWon == null || slot2GamesWon == null) {
    return null;
  }
  if (slot1GamesWon === slot2GamesWon) {
    return { slot1SetWins: 0, slot2SetWins: 0 };
  }
  if (slot1GamesWon > slot2GamesWon) {
    return { slot1SetWins: 1, slot2SetWins: 0 };
  }
  return { slot1SetWins: 0, slot2SetWins: 1 };
}

export function matchOutcome(
  sets: readonly Pick<SetRow, "slot1GamesWon" | "slot2GamesWon">[],
): {
  slot1SetWins: number;
  slot2SetWins: number;
  result: "slot1" | "slot2" | "draw" | "none";
} {
  let slot1SetWins = 0;
  let slot2SetWins = 0;
  let scored = 0;
  for (const set of sets) {
    const wins = setWinsForGames(set.slot1GamesWon, set.slot2GamesWon);
    if (!wins) {
      continue;
    }
    scored += 1;
    slot1SetWins += wins.slot1SetWins;
    slot2SetWins += wins.slot2SetWins;
  }
  if (scored === 0) {
    return { slot1SetWins, slot2SetWins, result: "none" };
  }
  if (slot1SetWins === slot2SetWins) {
    return { slot1SetWins, slot2SetWins, result: "draw" };
  }
  return {
    slot1SetWins,
    slot2SetWins,
    result: slot1SetWins > slot2SetWins ? "slot1" : "slot2",
  };
}

export function bothSlotsFilled(match: MatchRow) {
  return Boolean(match.slot1GameTeamId && match.slot2GameTeamId);
}

async function gameTeamHasTwoPlayers(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true },
  });
  return links.length === 2;
}

export async function bothSlottedTeamsComplete(
  database: DbClient,
  match: MatchRow,
) {
  if (
    !bothSlotsFilled(match) ||
    !match.slot1GameTeamId ||
    !match.slot2GameTeamId
  ) {
    return false;
  }
  return (
    (await gameTeamHasTwoPlayers(database, match.slot1GameTeamId)) &&
    (await gameTeamHasTwoPlayers(database, match.slot2GameTeamId))
  );
}

export async function userIsOnMatchSlots(
  database: DbClient,
  match: MatchRow,
  userId: string,
) {
  const slotIds = [match.slot1GameTeamId, match.slot2GameTeamId].filter(
    (id): id is string => Boolean(id),
  );
  if (slotIds.length === 0) {
    return false;
  }
  const player = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, match.gameId),
      eq(gamePlayers.userId, userId),
    ),
    columns: { id: true },
  });
  if (!player) {
    return false;
  }
  const link = await database.query.gameTeamPlayers.findFirst({
    where: and(
      eq(gameTeamPlayers.gamePlayerId, player.id),
      inArray(gameTeamPlayers.gameTeamId, slotIds),
    ),
    columns: { id: true },
  });
  return Boolean(link);
}

export async function requireMatchOnGame(
  database: DbClient,
  gameId: string,
  matchId: string,
) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== gameId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  return match;
}

function assertMatchAllowsSets(game: GameRow, match: MatchRow) {
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Sets this slice",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot change Sets on a cancelled Match",
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Match is completed; Sets are frozen",
    });
  }
}

export async function assertMayWriteSets(
  database: DbClient,
  game: GameRow,
  match: MatchRow,
  userId: string,
  organizer: boolean,
) {
  assertMatchAllowsSets(game, match);
  if (organizer) {
    return;
  }
  if (!bothSlotsFilled(match)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an organizer can add a Set shell while slots are empty",
    });
  }
  if (!(await userIsOnMatchSlots(database, match, userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only the organizer or Users on this Match’s Game teams can do that",
    });
  }
}

export async function addMatchSet(
  database: Tx | typeof db,
  game: GameRow,
  match: MatchRow,
  userId: string,
  organizer: boolean,
) {
  await assertMayWriteSets(database, game, match, userId, organizer);
  const [created] = await database
    .insert(matchSets)
    .values({ matchId: match.id })
    .returning();
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add Set",
    });
  }
  return created;
}

export async function scoreMatchSet(
  database: Tx | typeof db,
  game: GameRow,
  match: MatchRow,
  setId: string,
  userId: string,
  organizer: boolean,
  scores: { slot1GamesWon: number; slot2GamesWon: number },
) {
  await assertMayWriteSets(database, game, match, userId, organizer);
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Both Match slots need complete Game teams before entering games won",
    });
  }
  const set = await database.query.matchSets.findFirst({
    where: eq(matchSets.id, setId),
  });
  if (!set || set.matchId !== match.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Set not found",
    });
  }
  const [updated] = await database
    .update(matchSets)
    .set({
      slot1GamesWon: scores.slot1GamesWon,
      slot2GamesWon: scores.slot2GamesWon,
      updatedAt: new Date(),
    })
    .where(eq(matchSets.id, set.id))
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Set",
    });
  }
  return updated;
}

export async function removeMatchSet(
  database: Tx | typeof db,
  game: GameRow,
  match: MatchRow,
  setId: string,
  userId: string,
  organizer: boolean,
) {
  await assertMayWriteSets(database, game, match, userId, organizer);
  const deleted = await database
    .delete(matchSets)
    .where(and(eq(matchSets.id, setId), eq(matchSets.matchId, match.id)))
    .returning({ id: matchSets.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Set not found",
    });
  }
}

export async function completeMatch(
  database: Tx | typeof db,
  game: GameRow,
  match: MatchRow,
  userId: string,
  organizer: boolean,
) {
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Matches to complete this slice",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot complete a cancelled Match",
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Match is already completed",
    });
  }
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Both Match slots need complete Game teams before completing the Match",
    });
  }
  if (!organizer) {
    if (!bothSlotsFilled(match)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only an organizer can complete this Match",
      });
    }
    if (!(await userIsOnMatchSlots(database, match, userId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only the organizer or Users on this Match’s Game teams can complete it",
      });
    }
  }
  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found",
      });
    }
    if (locked.status === MatchStatusEnum.CANCELLED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot complete a cancelled Match",
      });
    }
    if (locked.status === MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Match is already completed",
      });
    }

    const sets = await tx.query.matchSets.findMany({
      where: eq(matchSets.matchId, locked.id),
      columns: { slot1GamesWon: true, slot2GamesWon: true },
    });
    if (sets.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Add at least one Set before completing the Match",
      });
    }
    const outcome = matchOutcome(sets);
    if (outcome.result === "none") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Score at least one Set before completing the Match",
      });
    }

    await tx
      .update(matches)
      .set({ status: MatchStatusEnum.COMPLETED, updatedAt: new Date() })
      .where(eq(matches.id, locked.id));

    await applyRatedMatch(tx, game, locked, outcome.result);
  });
}
