import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gracefulShutdown } from "./shutdown";

describe("gracefulShutdown", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("closes the server, then stops the worker, then exits 0, once", async () => {
    const steps: string[] = [];
    const exit = vi.fn((code: number) => steps.push(`exit ${code}`));
    const shutdown = gracefulShutdown({
      server: {
        close: (done) => {
          steps.push("close");
          setTimeout(() => done(), 5);
        },
        closeIdleConnections: () => steps.push("idle"),
      },
      worker: {
        stop: async () => {
          steps.push("worker");
        },
      },
      exit,
    });

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

    expect(steps).toEqual(["close", "idle", "worker", "exit 0"]);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("exits 1 when a step fails", async () => {
    const exit = vi.fn();
    await gracefulShutdown({
      worker: { stop: () => Promise.reject(new Error("stuck")) },
      exit,
    })("SIGTERM");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits 1 when shutting down takes too long", async () => {
    vi.useFakeTimers();
    try {
      const exit = vi.fn();
      void gracefulShutdown({
        server: { close: () => undefined },
        exit,
        timeoutMs: 1_000,
      })("SIGTERM");
      await vi.advanceTimersByTimeAsync(1_000);
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
