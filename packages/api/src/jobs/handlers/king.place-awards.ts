import { z } from "zod";

import type { Db } from "@repo/db";

import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { settleKingPlaceAwards } from "#src/ratings/settle-king-place-awards";

export const jobName = JOB.kingPlaceAwards;
export const payloadSchema = z.object({ gameId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.kingPlaceAwards;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction((tx) => settleKingPlaceAwards(tx, payload.gameId, now));
}
