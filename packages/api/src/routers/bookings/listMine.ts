import { and, asc, desc, eq, gt, inArray, lt, lte, or } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts, venues } from "@repo/db";
import { bookingStatusLabel } from "@repo/domain/booking-copy";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { occupyingBookings } from "#src/bookings/occupying";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const DEFAULT_LIMIT = 20;

const cursorSchema = z.object({ startsAt: z.date(), id: z.string().uuid() });

const listMineInput = z.object({
  scope: z.enum(["upcoming", "past"]),
  cursor: cursorSchema.optional(),
  limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
});

export async function listMyBookings(
  database: DbClient,
  args: {
    userId: string;
    scope: "upcoming" | "past";
    cursor?: z.infer<typeof cursorSchema>;
    limit?: number;
    now?: Date;
  },
) {
  const now = args.now ?? new Date();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const upcoming = args.scope === "upcoming";

  const scopeFilter = upcoming
    ? and(occupyingBookings(now), gt(bookings.endsAt, now))
    : or(
        and(eq(bookings.status, "confirmed"), lte(bookings.endsAt, now)),
        inArray(bookings.status, ["cancelled", "no_show"]),
      );

  const cursorFilter = args.cursor
    ? upcoming
      ? or(
          gt(bookings.startsAt, args.cursor.startsAt),
          and(
            eq(bookings.startsAt, args.cursor.startsAt),
            gt(bookings.id, args.cursor.id),
          ),
        )
      : or(
          lt(bookings.startsAt, args.cursor.startsAt),
          and(
            eq(bookings.startsAt, args.cursor.startsAt),
            lt(bookings.id, args.cursor.id),
          ),
        )
    : undefined;

  const rows = await database
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      priceFils: bookings.priceFils,
      gameId: bookings.gameId,
      venueId: venues.id,
      venueName: venues.name,
      venueCity: venues.city,
      venueLatitude: venues.latitude,
      venueLongitude: venues.longitude,
      courtId: courts.id,
      courtName: courts.name,
      courtSport: courts.sport,
    })
    .from(bookings)
    .innerJoin(venues, eq(venues.id, bookings.venueId))
    .innerJoin(courts, eq(courts.id, bookings.courtId))
    .where(and(eq(bookings.userId, args.userId), scopeFilter, cursorFilter))
    .orderBy(
      upcoming ? asc(bookings.startsAt) : desc(bookings.startsAt),
      upcoming ? asc(bookings.id) : desc(bookings.id),
    )
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);

  return {
    items: page.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      statusLabel: bookingStatusLabel(row.status),
      paymentStatus: row.paymentStatus,
      priceFils: row.priceFils,
      gameId: row.gameId,
      venue: {
        id: row.venueId,
        name: row.venueName,
        city: row.venueCity,
        latitude: row.venueLatitude,
        longitude: row.venueLongitude,
      },
      court: { id: row.courtId, name: row.courtName, sport: row.courtSport },
    })),
    nextCursor:
      rows.length > limit && last
        ? { startsAt: last.startsAt, id: last.id }
        : null,
  };
}

export const listMineProcedure = protectedProcedure
  .input(listMineInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listMyBookings(ctx.db, { ...input, userId: appUser.id });
  });
