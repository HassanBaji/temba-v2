import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { courts, venues } from "@repo/db";

import { type db } from "~/server/db";
import { loadGameCreateVenueContext } from "~/server/games/helpers/load-game-create-venue-context";
import { consult } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertGameCreateVenueAndCourt(
  database: DbClient,
  input: {
    groupId: string | undefined;
    venueId: string;
    courtId: string | null | undefined;
    courtIds?: string[];
  },
) {
  const context = await loadGameCreateVenueContext(database, input.groupId);
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, input.venueId),
    columns: { id: true, archivedAt: true },
  });

  if (context.locked) {
    if (!context.linkedVenueId || input.venueId !== context.linkedVenueId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Venue must be this Community’s linked Venue",
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }
    if (
      consult({ archivedAt: venue.archivedAt }).freeze("host") &&
      (input.courtId || (input.courtIds != null && input.courtIds.length > 0))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Skip Court when the linked Venue is Soft-archived",
      });
    }
  } else {
    const liveVenue = await database.query.venues.findFirst({
      where: liveVenuesWhere(),
      columns: { id: true },
    });
    if (!liveVenue) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No live Venues. Create is not available.",
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }
    if (consult({ archivedAt: venue.archivedAt }).freeze("catalog")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Venue must be a live Operator Venue",
      });
    }
  }

  const courtIds = [
    ...(input.courtId ? [input.courtId] : []),
    ...(input.courtIds ?? []),
  ];
  if (courtIds.length === 0) {
    return;
  }

  if (
    input.courtIds != null &&
    new Set(input.courtIds).size !== input.courtIds.length
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Duplicate courtIds",
    });
  }

  const uniqueCourtIds = [...new Set(courtIds)];
  const found = await database.query.courts.findMany({
    where: inArray(courts.id, uniqueCourtIds),
    columns: { id: true, venueId: true },
  });
  if (found.length !== uniqueCourtIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Court not found",
    });
  }
  if (found.some((court) => court.venueId !== input.venueId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Court must belong to the selected Venue",
    });
  }
}
