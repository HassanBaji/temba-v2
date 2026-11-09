import type { DbClient, DbTx } from "@repo/db";
import { and, eq, isNotNull } from "drizzle-orm";

import { gamePlayers, gameTeams, matches } from "@repo/db";

import { allPoolRoundsPosted } from "@repo/domain/tournament-round-state";
import { hasPools } from "@repo/domain/tournament-rounds";
import { resolveRoundCount } from "@repo/domain/tournament-sizing";

import { gameAdminUserIds, type GameRow } from "#src/games/access";
import { notify } from "#src/notifications/notify";

type DbOrTx = DbClient | DbTx;

type MatchStatus = (typeof matches.$inferSelect)["status"];

/**
 * Finished Game: not cancelled, not an Americano, and every Match completed or
 * cancelled with at least one completed. All cancelled counts as a cancelled Game.
 */
export function isGameFinishedByResults(
  game: Pick<GameRow, "format" | "cancelledAt">,
  matchStatuses: readonly MatchStatus[],
) {
  if (game.cancelledAt || game.format === "americano") {
    return false;
  }
  return (
    matchStatuses.every(
      (status) => status === "completed" || status === "cancelled",
    ) && matchStatuses.includes("completed")
  );
}

async function gamePlayerUserIds(database: DbOrTx, gameId: string) {
  const rows = await database
    .selectDistinct({ userId: gamePlayers.userId })
    .from(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), isNotNull(gamePlayers.userId)));
  return rows.flatMap((row) => (row.userId ? [row.userId] : []));
}

/** A Pool tournament whose Rounds are made as it goes is not over until the last Round is posted. */
async function poolRoundsStillToPost(
  database: DbOrTx,
  game: Pick<GameRow, "id" | "format" | "poolCount" | "roundCount">,
  rows: readonly { roundNumber: number | null; knockoutRound: number | null }[],
) {
  if (!hasPools(game.format, game.poolCount)) {
    return false;
  }
  const teams = await database
    .select({ poolIndex: gameTeams.poolIndex })
    .from(gameTeams)
    .where(eq(gameTeams.gameId, game.id));
  const sizes = new Map<number, number>();
  for (const { poolIndex } of teams) {
    if (poolIndex != null) {
      sizes.set(poolIndex, (sizes.get(poolIndex) ?? 0) + 1);
    }
  }
  return !allPoolRoundsPosted(
    rows,
    resolveRoundCount([...sizes.values()], game.roundCount),
  );
}

/** Call at the end of every Match-settling transaction; the dedupe key keeps it to one row per recipient per Game. */
export async function notifyIfGameFinished(
  database: DbOrTx,
  game: Pick<
    GameRow,
    | "id"
    | "format"
    | "cancelledAt"
    | "groupId"
    | "createdBy"
    | "challengeId"
    | "poolCount"
    | "roundCount"
  >,
): Promise<void> {
  const rows = await database
    .select({
      status: matches.status,
      roundNumber: matches.roundNumber,
      knockoutRound: matches.knockoutRound,
    })
    .from(matches)
    .where(eq(matches.gameId, game.id));
  if (
    !isGameFinishedByResults(
      game,
      rows.map((row) => row.status),
    ) ||
    (await poolRoundsStillToPost(database, game, rows))
  ) {
    return;
  }

  const adminIds = await gameAdminUserIds(database, game);
  const playerIds = await gamePlayerUserIds(database, game.id);
  await notify(database, {
    type: "game_finished",
    recipients: [
      ...adminIds.map((userId) => ({ userId, audience: "admin" as const })),
      ...playerIds.map((userId) => ({ userId, audience: "player" as const })),
    ],
    excludeUserIds: [],
    groupId: game.groupId,
    gameId: game.id,
    dedupeKey: `game_finished:${game.id}`,
  });
}
