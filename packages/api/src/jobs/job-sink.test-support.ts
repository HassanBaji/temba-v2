import { afterEach, beforeEach } from "vitest";

import { resetJobSink, setJobSink } from "./enqueue";
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

/** Records every Job the tests in the calling suite enqueue instead of writing to Graphile Worker. */
export function recordJobs(): RecordingJobSink {
  const sink = new RecordingJobSink();
  beforeEach(() => {
    sink.clear();
    setJobSink(sink);
  });
  afterEach(() => resetJobSink());
  return sink;
}
