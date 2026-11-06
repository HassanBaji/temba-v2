import { beforeEach } from "vitest";

import { setJobSink } from "#src/jobs/enqueue";
import { RecordingJobSink } from "#src/jobs/job-sink.test-support";

// PGlite has no graphile_worker schema, so a suite that reaches `enqueue`
// without installing its own sink would fail on the SQL one. Suites that
// assert on Jobs still call `recordJobs()` and get their own sink.
beforeEach(() => {
  setJobSink(new RecordingJobSink());
});
