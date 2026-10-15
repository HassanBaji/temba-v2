import { sql } from "drizzle-orm";

import type { DbClient } from "@repo/db";

export type JobKeyMode = "replace" | "preserve_run_at" | "unsafe_dedupe";

export type JobSpec = {
  name: string;
  key: string;
  payload: Record<string, unknown>;
  maxAttempts: number;
  mode?: JobKeyMode;
};

export type AddedJob = Required<Pick<JobSpec, "mode">> &
  Omit<JobSpec, "mode"> & { runAt: Date | null };

export interface JobSink {
  add(tx: DbClient, job: AddedJob): Promise<void>;
  remove(tx: DbClient, key: string): Promise<void>;
}

export const sqlJobSink: JobSink = {
  async add(tx, job) {
    await tx.execute(sql`
      select graphile_worker.add_job(
        ${job.name}::text,
        ${JSON.stringify(job.payload)}::json,
        job_key := ${job.key}::text,
        run_at := ${job.runAt ? job.runAt.toISOString() : null}::timestamptz,
        max_attempts := ${job.maxAttempts}::int,
        job_key_mode := ${job.mode}::text
      )
    `);
  },
  async remove(tx, key) {
    await tx.execute(sql`select graphile_worker.remove_job(${key}::text)`);
  },
};
