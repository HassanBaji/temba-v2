import { z } from "zod";

import type { Db } from "@repo/db";

import { expireLapsedHold } from "#src/bookings/expire-hold";
import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";

export const jobName = JOB.expireHold;
export const payloadSchema = z.object({ bookingId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.expireHold;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction((tx) =>
    expireLapsedHold(tx, { bookingId: payload.bookingId, now }),
  );
}
