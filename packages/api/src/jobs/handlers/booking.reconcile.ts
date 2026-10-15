import { z } from "zod";

import type { Db } from "@repo/db";

export const jobName = "booking.reconcile";
export const jobKey = "booking:reconcile";
export const crontabLine = `*/15 * * * * ${jobName} ?max=1&jobKey=${jobKey}&jobKeyMode=replace`;

export const payloadSchema = z.object({}).passthrough();
export const maxAttempts = 1;

export function handle(
  _db: Db,
  _payload: z.infer<typeof payloadSchema>,
): Promise<void> {
  console.log(JSON.stringify({ event: "booking_reconcile", status: "noop" }));
  return Promise.resolve();
}
