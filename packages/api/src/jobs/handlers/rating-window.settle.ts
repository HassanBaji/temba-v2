import { z } from "zod";

import type { Db } from "@repo/db";

import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { settleRatingWindow } from "#src/ratings/settle-rating-window";

export const jobName = JOB.ratingWindowSettle;
export const payloadSchema = z.object({ matchId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.ratingWindowSettle;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction((tx) => settleRatingWindow(tx, payload.matchId, now));
}
