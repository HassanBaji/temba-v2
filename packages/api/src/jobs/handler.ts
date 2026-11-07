import type { JobHelpers } from "graphile-worker";
import type { z } from "zod";

import type { Db } from "@repo/db";

export type JobHandler<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  payloadSchema: S;
  maxAttempts: number;
  handle(db: Db, payload: z.infer<S>, helpers: JobHelpers): Promise<void>;
};

export function logJobFailed(
  job: { name: string; key: string | null; attempts: number },
  error: unknown,
  permanent: boolean,
): void {
  console.error(
    JSON.stringify({
      event: "job_failed",
      name: job.name,
      key: job.key,
      attempts: job.attempts,
      permanent,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}
