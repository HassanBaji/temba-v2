import { TRPCError } from "@trpc/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";

import { bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { occupyingBookings } from "#src/bookings/occupying";

type DbOrTx = DbClient | DbTx;

/**
 * The no-double-booking step (ADR-0026). Call it inside a transaction: the
 * advisory lock is held to commit, so a second reservation for the same Court
 * waits, then sees this row in its overlap query.
 */
export async function reserveBooking(
  database: DbOrTx,
  args: { values: typeof bookings.$inferInsert; now: Date },
) {
  const { values, now } = args;

  await database.execute(
    sql`select pg_advisory_xact_lock(hashtext(${values.courtId}::text))`,
  );

  const [clash] = await database
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.courtId, values.courtId),
        occupyingBookings(now),
        lt(bookings.startsAt, values.endsAt),
        gt(bookings.endsAt, values.startsAt),
      ),
    )
    .limit(1);
  if (clash) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That slot was just taken",
    });
  }

  const [inserted] = await database.insert(bookings).values(values).returning();
  if (!inserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Booking",
    });
  }
  return inserted.id;
}
