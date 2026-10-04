import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { requireOperator } from "~/server/auth/require-operator";

function contextFor(metadata: Record<string, unknown> | undefined) {
  return createTRPCContext({
    userId: "user_clerk",
    getPublicMetadata: async () => metadata,
    headers: new Headers(),
    webOrigin: "https://temba.example",
  });
}

describe("requireOperator", () => {
  it("accepts operator public metadata", async () => {
    await expect(
      requireOperator({ getPublicMetadata: async () => ({ operator: true }) }),
    ).resolves.toBeUndefined();
  });

  it.each([undefined, {}, { operator: "true" }, { operator: false }])(
    "refuses %j",
    async (metadata) => {
      await expect(
        requireOperator({ getPublicMetadata: async () => metadata }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("refuses a non-Operator at the Operator procedure door", async () => {
    const caller = createCaller(() => contextFor({}));
    await expect(caller.venues.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
