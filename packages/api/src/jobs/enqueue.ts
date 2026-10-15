import type { DbClient } from "@repo/db";

import { sqlJobSink, type JobSink, type JobSpec } from "./job-sink";

let sink: JobSink = sqlJobSink;

export function setJobSink(next: JobSink): void {
  sink = next;
}

export function resetJobSink(): void {
  sink = sqlJobSink;
}

export function enqueue(tx: DbClient, job: JobSpec): Promise<void> {
  return sink.add(tx, { ...job, mode: job.mode ?? "replace", runAt: null });
}

export function enqueueAt(
  tx: DbClient,
  job: JobSpec,
  runAt: Date,
): Promise<void> {
  return sink.add(tx, { ...job, mode: job.mode ?? "replace", runAt });
}

export function removeJob(tx: DbClient, jobKey: string): Promise<void> {
  return sink.remove(tx, jobKey);
}
