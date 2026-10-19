import type { JobHelpers } from "graphile-worker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Db } from "@repo/db";

import type { JobHandler } from "./handler";
import { createTaskList, crontab, wrapHandler } from "./task-list";

const db = {} as Db;

function helpers(attempts: number, maxAttempts: number): JobHelpers {
  return {
    job: {
      task_identifier: "t.job",
      key: "t:1",
      attempts,
      max_attempts: maxAttempts,
    },
  } as unknown as JobHelpers;
}

function failedLogs(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls
    .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
    .filter((entry) => entry.event === "job_failed");
}

describe("wrapHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  const handle = vi.fn<JobHandler["handle"]>();
  const handler: JobHandler = {
    payloadSchema: z.object({ id: z.number() }),
    maxAttempts: 3,
    handle,
  };

  it("completes an invalid payload without calling the handler or retrying", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      wrapHandler(handler, db)({ id: "x" }, helpers(1, 3)),
    ).resolves.toBeUndefined();
    expect(handle).not.toHaveBeenCalled();
    expect(failedLogs(spy)).toHaveLength(1);
    expect(failedLogs(spy)[0]).toMatchObject({ permanent: true });
  });

  it("passes the parsed payload to the handler", async () => {
    handle.mockResolvedValueOnce();
    const h = helpers(1, 3);
    await wrapHandler(handler, db)({ id: 7 }, h);
    expect(handle).toHaveBeenCalledWith(db, { id: 7 }, h);
  });

  it("rethrows without job_failed before the final attempt", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handle.mockRejectedValueOnce(new Error("boom"));
    await expect(
      wrapHandler(handler, db)({ id: 1 }, helpers(2, 3)),
    ).rejects.toThrow("boom");
    expect(failedLogs(spy)).toHaveLength(0);
  });

  it("logs job_failed on the final attempt and rethrows", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handle.mockRejectedValueOnce(new Error("boom"));
    await expect(
      wrapHandler(handler, db)({ id: 1 }, helpers(3, 3)),
    ).rejects.toThrow("boom");
    expect(failedLogs(spy)).toEqual([
      expect.objectContaining({
        name: "t.job",
        key: "t:1",
        error: "boom",
        permanent: false,
      }),
    ]);
  });
});

describe("task list", () => {
  it("registers booking.reconcile on a 15 minute cron", () => {
    expect(Object.keys(createTaskList(db)).sort()).toEqual([
      "booking.confirmed",
      "booking.expire-hold",
      "booking.reconcile",
      "payment.create-charge",
      "payment.poll-charge",
      "payment.process-webhook",
      "payment.refund",
    ]);
    expect(crontab).toContain("*/15 * * * * booking.reconcile");
  });
});
