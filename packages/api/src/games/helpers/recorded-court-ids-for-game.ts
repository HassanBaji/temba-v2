import { eq } from "drizzle-orm";

import { gameCourts } from "@repo/db";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function recordedCourtIdsForGame(
  database: DbClient,
  gameId: string,
) {
  const rows = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, gameId),
    columns: { courtId: true },
  });
  if (rows.length === 0) {
    return null;
  }
  return rows.map((row) => row.courtId);
}

/**
 * The Courts a Match on this Game may use, or `null` for any Court of the
 * Venue. A Friendly game's recorded Court is its current one, not a pool,
 * so the Organizer can move it to any Court of the Venue.
 */
export async function recordedCourtPool(
  database: DbClient,
  game: Pick<GameRow, "id" | "format">,
) {
  if (game.format === "friendly_game") {
    return null;
  }
  return recordedCourtIdsForGame(database, game.id);
}
