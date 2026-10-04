import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { courts } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "#src/games/access";
import { recordedCourtIdsForGame } from "#src/games/helpers/recorded-court-ids-for-game";
import { venueForGame } from "#src/games/helpers/venue-for-game";
import { consult } from "#src/soft-archive";

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

export const listCourtsProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listCourts(ctx.db, { gameId: input.gameId, userId: appUser.id });
  });
