import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { courts } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { recordedCourtIdsForGame } from "~/server/games/helpers/recorded-court-ids-for-game";
import { venueForGame } from "~/server/games/helpers/venue-for-game";
import { consult } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertCourtAssignable(
  database: DbClient,
  game: GameRow,
  courtId: string,
) {
  const court = await database.query.courts.findFirst({
    where: eq(courts.id, courtId),
    columns: { id: true, venueId: true },
  });
  if (!court) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }

  const venue = await venueForGame(database, game.venueId);
  if (!venue) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Venue not found",
    });
  }
  if (consult({ archivedAt: venue.archivedAt }).freeze("host")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot assign a Court on an archived Venue",
    });
  }
  if (court.venueId !== game.venueId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must belong to this Game's Venue",
    });
  }

  const recordedCourtIds = await recordedCourtIdsForGame(database, game.id);
  if (recordedCourtIds != null && !recordedCourtIds.includes(courtId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must be one of the Courts recorded on this Game",
    });
  }
}
