import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDb } from "@repo/db/testing";

import {
  enqueue,
  enqueueAt,
  removeJob,
  resetJobSink,
  setJobSink,
} from "./enqueue";
import { RecordingJobSink } from "./job-sink.test-support";
import { sqlJobSink } from "./job-sink";

describe("enqueue", () => {
  const sink = new RecordingJobSink();

  beforeEach(() => {
    sink.clear();
    setJobSink(sink);
  });
  afterEach(resetJobSink);

  it("records name, key, payload, mode, run_at and max attempts", async () => {
    const { db, close } = await createPgliteDb();
    const runAt = new Date("2030-01-01T10:00:00Z");

    await enqueue(db, {
      name: "a.job",
      key: "a:1",
      payload: { id: 1 },
      maxAttempts: 3,
    });
    await enqueueAt(
      db,
      {
        name: "b.job",
        key: "b:1",
        payload: {},
        maxAttempts: 5,
        mode: "preserve_run_at",
      },
      runAt,
    );
    await removeJob(db, "a:1");

    expect(sink.added).toEqual([
      {
        name: "a.job",
        key: "a:1",
        payload: { id: 1 },
        maxAttempts: 3,
        mode: "replace",
        runAt: null,
      },
      {
        name: "b.job",
        key: "b:1",
        payload: {},
        maxAttempts: 5,
        mode: "preserve_run_at",
        runAt,
      },
    ]);
    expect(sink.removed).toEqual(["a:1"]);
    await close();
  });

  it("the default sink is the SQL one", async () => {
    resetJobSink();
    const { db, close } = await createPgliteDb();
    await expect(
      enqueue(db, { name: "x", key: "x", payload: {}, maxAttempts: 1 }),
    ).rejects.toThrow();
    expect(sqlJobSink.add).toBeTypeOf("function");
    await close();
  });
});
