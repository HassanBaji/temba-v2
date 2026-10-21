import { TRPCError } from "@trpc/server";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";

import { bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { occupyingBookings } from "#src/bookings/occupying";

type DbOrTx = DbClient | DbTx;

/**
 * The no-double-booking step (ADR-0026). Call it inside a transaction: the
 * advisory lock is held to commit, so a second reservation for the same Court
 * waits, then sees the first in its overlap query. A Booking being moved
 * passes its own id so it does not clash with itself.
 */
export async function requireFreeCourt(
  database: DbOrTx,
  args: {
    courtId: string;
    startsAt: Date;
    endsAt: Date;
    now: Date;
    excludeBookingId?: string;
  },
) {
  await database.execute(
    sql`select pg_advisory_xact_lock(hashtext(${args.courtId}::text))`,
  );

  const [clash] = await database
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.courtId, args.courtId),
        occupyingBookings(args.now),
        lt(bookings.startsAt, args.endsAt),
        gt(bookings.endsAt, args.startsAt),
        args.excludeBookingId
          ? ne(bookings.id, args.excludeBookingId)
          : undefined,
      ),
    )
    .limit(1);
  if (clash) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That slot was just taken",
    });
  }
}

export async function reserveBooking(
  database: DbOrTx,
  args: { values: typeof bookings.$inferInsert; now: Date },
) {
  const { values, now } = args;
  await requireFreeCourt(database, {
    courtId: values.courtId,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    now,
  });

  const [inserted] = await database.insert(bookings).values(values).returning();
  if (!inserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Booking",
    });
  }
  return inserted.id;
}
