import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";

import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";
import { createPgliteDb } from "@repo/db/testing";

describe("resolvePhonePlayer", () => {
  it("tells an account, an Unclaimed player and a new number apart", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [account] = await db
        .insert(user)
        .values({
          name: "Ahmed Ali",
          phoneNumber: "+97336110001",
          clerkId: "user_ahmed",
        })
        .returning();
      const [unclaimed] = await db
        .insert(user)
        .values({
          name: "Ali",
          phoneNumber: "+97336110002",
          addedByUserId: account!.id,
          addedAt: new Date(),
        })
        .returning();

      const resolvedAccount = await resolvePhonePlayer(db, "+97336110001");
      expect(resolvedAccount.kind).toBe("account");
      expect(
        resolvedAccount.kind === "account" && resolvedAccount.user.id,
      ).toBe(account!.id);

      const resolvedUnclaimed = await resolvePhonePlayer(db, "+97336110002");
      expect(resolvedUnclaimed.kind).toBe("unclaimed");
      expect(
        resolvedUnclaimed.kind === "unclaimed" && resolvedUnclaimed.user.id,
      ).toBe(unclaimed!.id);

      expect(await resolvePhonePlayer(db, "+97336110003")).toEqual({
        kind: "new",
      });
    } finally {
      await close();
    }
  });

  it("reads a legacy row without a clerkId as an account, not Unclaimed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [legacy] = await db
        .insert(user)
        .values({ name: "Legacy", phoneNumber: "+97336110004" })
        .returning();

      const resolved = await resolvePhonePlayer(db, "+97336110004");

      expect(resolved.kind).toBe("account");
      expect(resolved.kind === "account" && resolved.user.id).toBe(legacy!.id);
    } finally {
      await close();
    }
  });
});
