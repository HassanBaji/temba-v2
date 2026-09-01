import { eq } from "drizzle-orm";

import { gameCourts } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recordedCourtIdsForGame(
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
