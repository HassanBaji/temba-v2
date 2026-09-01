import { and, eq, inArray } from "drizzle-orm";

import { courts } from "@repo/db";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { recordedCourtIdsForGame } from "~/server/games/helpers/recorded-court-ids-for-game";
import { venueForGame } from "~/server/games/helpers/venue-for-game";
import { consult } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listAssignableCourts(database: DbClient, game: GameRow) {
  const venue = await venueForGame(database, game.venueId);
  if (!venue || consult({ archivedAt: venue.archivedAt }).freeze("catalog")) {
    return [];
  }

  const recordedCourtIds = await recordedCourtIdsForGame(database, game.id);
  const rows = await database.query.courts.findMany({
    where:
      recordedCourtIds == null
        ? eq(courts.venueId, venue.id)
        : and(
            eq(courts.venueId, venue.id),
            inArray(courts.id, recordedCourtIds),
          ),
    columns: { id: true, name: true, venueId: true },
    orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    venueId: row.venueId,
    venueName: venue.name,
  }));
}

export async function listCourts(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return listAssignableCourts(database, game);
}
