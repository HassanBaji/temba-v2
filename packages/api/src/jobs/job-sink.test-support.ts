import type { AddedJob, JobSink } from "./job-sink";

export class RecordingJobSink implements JobSink {
  readonly added: AddedJob[] = [];
  readonly removed: string[] = [];

  add(_tx: unknown, job: AddedJob): Promise<void> {
    this.added.push(job);
    return Promise.resolve();
  }

  remove(_tx: unknown, key: string): Promise<void> {
    this.removed.push(key);
    return Promise.resolve();
  }

  clear(): void {
    this.added.length = 0;
    this.removed.length = 0;
  }
}
