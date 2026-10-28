import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, inArray, lt, ne, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import {
  bookings,
  courts,
  user,
  venueClosures,
  venueOpeningHours,
  venues,
} from "@repo/db";
import { bookingStatusLabel } from "@repo/domain/booking-copy";
import {
  addProductDays,
  productDayKey,
  productDaysBetween,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export const MAX_BOOKING_RANGE_DAYS = 31;

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const bookingStatuses = [
  "pending_payment",
  "confirmed",
  "cancelled",
  "no_show",
  "expired",
] as const;
const paymentStatuses = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "waived",
] as const;

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  const midnight = zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: day ?? Number.NaN,
  });
  if (productDayKey(midnight) !== value) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Not a valid day" });
  }
  return midnight;
}

export async function listBookingsForVenue(
  database: DbClient,
  args: {
    venueId: string;
    from: string;
    to: string;
    courtId?: string;
    status?: (typeof bookingStatuses)[number][];
    paymentStatus?: (typeof paymentStatuses)[number][];
    source?: ("app" | "venue")[];
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
) {
  const now = args.now ?? new Date();
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  const rangeStart = parseDay(args.from);
  const lastDay = parseDay(args.to);
  const dayCount = productDaysBetween(rangeStart, lastDay) + 1;
  if (dayCount < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The end day is before the start day",
    });
  }
  if (dayCount > MAX_BOOKING_RANGE_DAYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Choose at most ${MAX_BOOKING_RANGE_DAYS} days`,
    });
  }
  const rangeEnd = addProductDays(lastDay, 1);

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: { id: true, slotMinutes: true },
  });
  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const filters: (SQL | undefined)[] = [
    eq(bookings.venueId, args.venueId),
    lt(bookings.startsAt, rangeEnd),
    gt(bookings.endsAt, rangeStart),
    or(ne(bookings.status, "pending_payment"), gt(bookings.holdExpiresAt, now)),
    args.status
      ? inArray(bookings.status, args.status)
      : ne(bookings.status, "expired"),
    args.courtId ? eq(bookings.courtId, args.courtId) : undefined,
    args.paymentStatus
      ? inArray(bookings.paymentStatus, args.paymentStatus)
      : undefined,
    args.source ? inArray(bookings.source, args.source) : undefined,
  ];

  const [courtRows, hours, closureRows, bookingRows] = await Promise.all([
    database
      .select({ id: courts.id, name: courts.name, sport: courts.sport })
      .from(courts)
      .where(eq(courts.venueId, args.venueId))
      .orderBy(asc(courts.name), asc(courts.id)),
    database
      .select({
        weekday: venueOpeningHours.weekday,
        opensAtMinutes: venueOpeningHours.opensAtMinutes,
        closesAtMinutes: venueOpeningHours.closesAtMinutes,
      })
      .from(venueOpeningHours)
      .where(eq(venueOpeningHours.venueId, args.venueId))
      .orderBy(asc(venueOpeningHours.opensAtMinutes)),
    database
      .select({
        id: venueClosures.id,
        courtId: venueClosures.courtId,
        startsAt: venueClosures.startsAt,
        endsAt: venueClosures.endsAt,
        reason: venueClosures.reason,
      })
      .from(venueClosures)
      .where(
        and(
          eq(venueClosures.venueId, args.venueId),
          lt(venueClosures.startsAt, rangeEnd),
          gt(venueClosures.endsAt, rangeStart),
        ),
      )
      .orderBy(asc(venueClosures.startsAt), asc(venueClosures.id)),
    database
      .select({
        id: bookings.id,
        courtId: bookings.courtId,
        courtName: courts.name,
        courtSport: courts.sport,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        holdExpiresAt: bookings.holdExpiresAt,
        source: bookings.source,
        priceFils: bookings.priceFils,
        paymentStatus: bookings.paymentStatus,
        gameId: bookings.gameId,
        userId: bookings.userId,
        userName: user.name,
        userImage: user.image,
        guestName: bookings.guestName,
        guestPhone: bookings.guestPhone,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .leftJoin(user, eq(user.id, bookings.userId))
      .where(and(...filters))
      .orderBy(asc(bookings.startsAt), asc(bookings.id)),
  ]);

  const days = Array.from({ length: dayCount }, (_, index) => {
    const midnight = addProductDays(rangeStart, index);
    const [year, month, day] = productDayKey(midnight).split("-").map(Number);
    const weekday = new Date(
      Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1),
    ).getUTCDay();
    return {
      day: productDayKey(midnight),
      windows: hours
        .filter((window) => window.weekday === weekday)
        .map(({ opensAtMinutes, closesAtMinutes }) => ({
          opensAtMinutes,
          closesAtMinutes,
        })),
    };
  });

  return {
    from: args.from,
    to: args.to,
    grid: {
      slotMinutes: venue.slotMinutes,
      courts: courtRows,
      days,
      closures: closureRows,
    },
    bookings: bookingRows.map((row) => ({
      id: row.id,
      courtId: row.courtId,
      courtName: row.courtName,
      courtSport: row.courtSport,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      statusLabel: bookingStatusLabel(row.status),
      holdExpiresAt: row.holdExpiresAt,
      source: row.source,
      priceFils: row.priceFils,
      paymentStatus: row.paymentStatus,
      gameId: row.gameId,
      holder: row.userId
        ? {
            kind: "user" as const,
            userId: row.userId,
            name: row.userName ?? "",
            image: row.userImage,
          }
        : {
            kind: "guest" as const,
            name: row.guestName ?? "",
            phone: row.guestPhone ?? "",
          },
    })),
  };
}

export const listForVenueProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      from: dayKey,
      to: dayKey,
      courtId: z.string().uuid().optional(),
      status: z.array(z.enum(bookingStatuses)).min(1).optional(),
      paymentStatus: z.array(z.enum(paymentStatuses)).min(1).optional(),
      source: z
        .array(z.enum(["app", "venue"]))
        .min(1)
        .optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listBookingsForVenue(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
