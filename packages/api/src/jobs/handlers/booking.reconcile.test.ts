import { describe, expect, it, vi } from "vitest";

import { createPgliteDb } from "@repo/db/testing";
import type { Db } from "@repo/db";

import { handle, payloadSchema } from "./booking.reconcile";

describe("booking.reconcile", () => {
  it("is a no-op on an empty database", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { db, close } = await createPgliteDb();
    await expect(
      handle(db as unknown as Db, payloadSchema.parse({})),
    ).resolves.toBeUndefined();
    log.mockRestore();
    await close();
  });
});
