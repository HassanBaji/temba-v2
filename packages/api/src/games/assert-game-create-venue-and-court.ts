import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { courts, venues } from "@repo/db";

import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { loadGameCreateVenueContext } from "#src/games/helpers/load-game-create-venue-context";
import { consult } from "#src/soft-archive";
import { liveVenuesWhere } from "#src/soft-archive/adapter";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertGameCreateVenueAndCourt(
  database: DbClient,
  input: {
    groupId: string | undefined;
    venueId: string;
    courtId: string | null | undefined;
    courtIds?: string[];
    sport?: Sport;
    locale?: Locale;
  },
) {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const context = await loadGameCreateVenueContext(
    database,
    input.groupId,
    locale,
  );
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, input.venueId),
    columns: { id: true, archivedAt: true },
  });

  if (context.locked) {
    if (!context.linkedVenueId || input.venueId !== context.linkedVenueId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.venueNotLinked,
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).venue.errors.notFound,
      });
    }
    if (
      consult({ archivedAt: venue.archivedAt }).freeze("host") &&
      (input.courtId || (input.courtIds != null && input.courtIds.length > 0))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.skipCourtArchived,
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
        message: messagesFor(locale).game.errors.noLiveVenues,
      });
    }
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).venue.errors.notFound,
      });
    }
    if (consult({ archivedAt: venue.archivedAt }).freeze("catalog")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).game.errors.venueNotLive,
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
      message: messagesFor(locale).game.errors.duplicateCourts,
    });
  }

  const uniqueCourtIds = [...new Set(courtIds)];
  const found = await database.query.courts.findMany({
    where: inArray(courts.id, uniqueCourtIds),
    columns: { id: true, venueId: true, sport: true },
  });
  if (found.length !== uniqueCourtIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.courtNotFound,
    });
  }
  if (found.some((court) => court.venueId !== input.venueId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.courtNotSelectedVenue,
    });
  }
  const sport = input.sport ?? DEFAULT_SPORT;
  if (found.some((court) => court.sport !== sport)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        sport === "football"
          ? messagesFor(locale).game.errors.pickFootballPitch
          : messagesFor(locale).game.errors.padelCourtRequired,
    });
  }
}
