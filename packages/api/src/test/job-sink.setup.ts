import { beforeEach } from "vitest";

import { setJobSink } from "#src/jobs/enqueue";
import { RecordingJobSink } from "#src/jobs/job-sink.test-support";

// PGlite has no graphile_worker schema, so a door that enqueues a Job (Match
// completion schedules the MVP settle) records it instead of calling the
// worker. Suites that assert on Jobs install their own sink after this one.
beforeEach(() => {
  setJobSink(new RecordingJobSink());
});
