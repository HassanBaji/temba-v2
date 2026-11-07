import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { insertUser } from "#src/marks/marks.test-support";
import { loadMyProfile } from "#src/routers/users/myProfile";
import { loadProfileDetails } from "#src/routers/users/profileDetails";
import { setHideRoasts } from "#src/routers/users/setHideRoasts";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function storedHideRoasts(db: TestDatabase, userId: string) {
  const row = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { hideRoasts: true },
  });
  return row?.hideRoasts;
}

describe("users.setHideRoasts", () => {
  it("writes the User's own setting, which Settings and the You page read", async () => {
    await withDb(async (db) => {
      const owner = await insertUser(db, "Owner");
      const other = await insertUser(db, "Other");
      expect(await storedHideRoasts(db, owner.id)).toBe(false);
      expect((await loadProfileDetails(db, owner.id)).hideRoasts).toBe(false);

      expect(await setHideRoasts(db, { userId: owner.id, hide: true })).toEqual(
        { hideRoasts: true },
      );
      expect(await storedHideRoasts(db, owner.id)).toBe(true);
      expect(await storedHideRoasts(db, other.id)).toBe(false);
      expect((await loadProfileDetails(db, owner.id)).hideRoasts).toBe(true);
      const you = await loadMyProfile(db as never, {
        userId: owner.id,
        sport: "padel",
      });
      expect(you.hideRoasts).toBe(true);

      await setHideRoasts(db, { userId: owner.id, hide: false });
      expect(await storedHideRoasts(db, owner.id)).toBe(false);
    });
  });
});
