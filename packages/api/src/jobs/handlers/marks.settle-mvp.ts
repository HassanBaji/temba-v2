import { z } from "zod";

import type { Db } from "@repo/db";

import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { settleMvp } from "#src/marks/settle-mvp";

export const jobName = JOB.settleMvp;
export const payloadSchema = z.object({ gameId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.settleMvp;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction((tx) => settleMvp(tx, payload.gameId, now));
}
