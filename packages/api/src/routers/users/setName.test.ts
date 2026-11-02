import { user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { setNameSchema, writeUserName } from "#src/routers/users/setName";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, clerkId: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: "legacyhandle",
      username: "legacyhandle",
      email: `${clerkId}@example.com`,
      clerkId,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

describe("writeUserName", () => {
  it("stores both halves and rebuilds the display name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "set_name_user");
      const result = await writeUserName(db, {
        userId: appUser.id,
        firstName: "Mikael",
        lastName: "Karlsson",
      });
      expect(result).toEqual({
        firstName: "Mikael",
        lastName: "Karlsson",
        name: "Mikael Karlsson",
      });
      const row = await db.query.user.findFirst({
        where: eq(user.id, appUser.id),
      });
      expect(row?.name).toBe("Mikael Karlsson");
      expect(row?.username).toBe("legacyhandle");
    } finally {
      await close();
    }
  });

  it("refuses an unknown user", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await expect(
        writeUserName(db, {
          userId: "00000000-0000-0000-0000-000000000000",
          firstName: "A",
          lastName: "B",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

describe("setNameSchema", () => {
  it("trims and requires both names", () => {
    expect(
      setNameSchema.parse({ firstName: " Mikael ", lastName: "K " }),
    ).toEqual({
      firstName: "Mikael",
      lastName: "K",
    });
    expect(
      setNameSchema.safeParse({ firstName: "Mikael", lastName: "  " }).success,
    ).toBe(false);
  });
});
