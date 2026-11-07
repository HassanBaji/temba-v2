import { user } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { loadProfileDetails } from "#src/routers/users/profileDetails";
import { setLocaleSchema, writeLocale } from "#src/routers/users/setLocale";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, clerkId: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: "Omar Aziz",
      email: `${clerkId}@example.com`,
      clerkId,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

describe("writeLocale", () => {
  it("starts null and reads back what the client wrote", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "set_locale_user");
      expect((await loadProfileDetails(db, appUser.id)).locale).toBeNull();

      expect(
        await writeLocale(db, { userId: appUser.id, locale: "ar" }),
      ).toEqual({ locale: "ar" });
      expect((await loadProfileDetails(db, appUser.id)).locale).toBe("ar");

      await writeLocale(db, { userId: appUser.id, locale: "en" });
      expect((await loadProfileDetails(db, appUser.id)).locale).toBe("en");
    } finally {
      await close();
    }
  });
});

describe("setLocaleSchema", () => {
  it("accepts only the two Locales", () => {
    expect(setLocaleSchema.parse({ locale: "en" })).toEqual({ locale: "en" });
    expect(setLocaleSchema.parse({ locale: "ar" })).toEqual({ locale: "ar" });
    for (const locale of ["fr", "EN", "ar-BH", "", null, undefined]) {
      expect(setLocaleSchema.safeParse({ locale }).success).toBe(false);
    }
  });
});
