import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";

import {
  isUnclaimed,
  notUnclaimedUserSql,
  unclaimedUserSql,
} from "#src/unclaimed-players/is-unclaimed";
import { createPgliteDb } from "@repo/db/testing";

describe("Unclaimed player predicate", () => {
  it("reads only a row with no clerkId and an added_at as Unclaimed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [organizer] = await db
        .insert(user)
        .values({
          name: "Organizer",
          email: "organizer@example.com",
          clerkId: "user_organizer",
        })
        .returning();
      const [unclaimed] = await db
        .insert(user)
        .values({
          name: "Ali",
          phoneNumber: "+97336124408",
          addedByUserId: organizer!.id,
          addedAt: new Date(),
        })
        .returning();
      const [legacy] = await db
        .insert(user)
        .values({ name: "Legacy", email: "legacy@example.com" })
        .returning();
      const [claimed] = await db
        .insert(user)
        .values({
          name: "Claimed",
          phoneNumber: "+97336120000",
          clerkId: "user_claimed",
          addedAt: new Date(),
          claimedAt: new Date(),
        })
        .returning();

      expect(isUnclaimed(unclaimed!)).toBe(true);
      expect(isUnclaimed(legacy!)).toBe(false);
      expect(isUnclaimed(organizer!)).toBe(false);
      expect(isUnclaimed(claimed!)).toBe(false);

      const unclaimedRows = await db.query.user.findMany({
        where: unclaimedUserSql,
        columns: { id: true },
      });
      expect(unclaimedRows.map((row) => row.id)).toEqual([unclaimed!.id]);

      const otherRows = await db.query.user.findMany({
        where: notUnclaimedUserSql,
        columns: { id: true },
      });
      expect(otherRows.map((row) => row.id).sort()).toEqual(
        [organizer!.id, legacy!.id, claimed!.id].sort(),
      );
    } finally {
      await close();
    }
  });

  it("refuses an Unclaimed row without a phone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        db.insert(user).values({
          name: "No phone",
          email: "no-phone@example.com",
          addedAt: new Date(),
        }),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "user_unclaimed_has_phone",
      });

      const [withAccount] = await db
        .insert(user)
        .values({
          name: "Has account",
          email: "has-account@example.com",
          clerkId: "user_has_account",
          addedAt: new Date(),
        })
        .returning({ id: user.id });
      expect(withAccount).toBeDefined();

      expect(
        await db.query.user.findFirst({
          where: eq(user.email, "no-phone@example.com"),
        }),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("clears added_by when the adding User is deleted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [organizer] = await db
        .insert(user)
        .values({ name: "Organizer", email: "gone@example.com" })
        .returning();
      const [unclaimed] = await db
        .insert(user)
        .values({
          name: "Ali",
          phoneNumber: "+97336124408",
          addedByUserId: organizer!.id,
          addedAt: new Date(),
        })
        .returning();

      await db.delete(user).where(eq(user.id, organizer!.id));

      const after = await db.query.user.findFirst({
        where: eq(user.id, unclaimed!.id),
      });
      expect(after?.addedByUserId).toBeNull();
      expect(isUnclaimed(after!)).toBe(true);
    } finally {
      await close();
    }
  });
});
