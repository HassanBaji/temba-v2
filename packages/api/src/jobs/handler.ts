import type { JobHelpers } from "graphile-worker";
import type { z } from "zod";

import type { Db } from "@repo/db";

export type JobHandler<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  payloadSchema: S;
  maxAttempts: number;
  handle(db: Db, payload: z.infer<S>, helpers: JobHelpers): Promise<void>;
};
