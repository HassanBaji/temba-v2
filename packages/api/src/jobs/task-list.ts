import type { JobHelpers, TaskList } from "graphile-worker";

import { db as defaultDb, type Db } from "@repo/db";

import * as bookingReconcile from "./handlers/booking.reconcile";
import type { JobHandler } from "./handler";

const handlers: Record<string, JobHandler> = {
  [bookingReconcile.jobName]: bookingReconcile,
};

export const crontab = [bookingReconcile.crontabLine].join("\n");

function logJobFailed(helpers: JobHelpers, error: unknown, permanent: boolean) {
  console.error(
    JSON.stringify({
      event: "job_failed",
      name: helpers.job.task_identifier,
      key: helpers.job.key,
      attempts: helpers.job.attempts,
      permanent,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

export function wrapHandler(handler: JobHandler, db: Db) {
  return async (rawPayload: unknown, helpers: JobHelpers): Promise<void> => {
    const parsed = handler.payloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      // Retrying cannot fix a payload that fails its schema, so the job
      // completes after logging instead of throwing.
      logJobFailed(helpers, parsed.error, true);
      return;
    }
    try {
      await handler.handle(db, parsed.data, helpers);
    } catch (error) {
      const isFinalAttempt = helpers.job.attempts >= helpers.job.max_attempts;
      if (isFinalAttempt) logJobFailed(helpers, error, false);
      throw error;
    }
  };
}

export function createTaskList(db: Db = defaultDb): TaskList {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, handler]) => [
      name,
      wrapHandler(handler, db),
    ]),
  );
}
