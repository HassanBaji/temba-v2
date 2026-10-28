import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings, type Db } from "@repo/db";

import { enqueue, removeJob } from "#src/jobs/enqueue";
import {
  JOB,
  MAX_ATTEMPTS,
  bookingNotificationJob,
  expireHoldKey,
} from "#src/jobs/specs";

export const jobName = JOB.confirmed;
export const payloadSchema = z.object({ bookingId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.confirmed;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
): Promise<void> {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, payload.bookingId),
    columns: { id: true, status: true, userId: true, createdByUserId: true },
  });
  if (!booking) {
    return;
  }

  await db.transaction(async (tx) => {
    await removeJob(tx, expireHoldKey(booking.id));
    if (booking.status !== "confirmed") {
      return;
    }
    await enqueue(
      tx,
      bookingNotificationJob({
        type: "booking_created",
        bookingId: booking.id,
        dedupe: "confirmed",
        actorUserId: booking.createdByUserId ?? booking.userId ?? undefined,
      }),
    );
  });
}
