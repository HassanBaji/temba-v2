import { describe, expect, it } from "vitest";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { requireLevelSetter } from "#src/auth/require-level-setter";

function contextFor(metadata: Record<string, unknown> | undefined) {
  return createTRPCContext({
    db: {} as Parameters<typeof createTRPCContext>[0]["db"],
    userId: "user_clerk",
    getPublicMetadata: async () => metadata,
    headers: new Headers(),
    webOrigin: "https://temba.example",
  });
}

describe("requireLevelSetter", () => {
  it("accepts levelSetter public metadata", async () => {
    await expect(
      requireLevelSetter({
        getPublicMetadata: async () => ({ levelSetter: true }),
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    undefined,
    {},
    { levelSetter: "true" },
    { levelSetter: false },
    { operator: true },
  ])("refuses %j", async (metadata) => {
    await expect(
      requireLevelSetter({ getPublicMetadata: async () => metadata }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a non-Level-setter at the Level setter procedure door", async () => {
    const caller = createCaller(() => contextFor({}));
    await expect(
      caller.ratings.setLevel({
        groupId: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        levelTenths: 36,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
