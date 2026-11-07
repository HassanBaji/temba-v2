import { user } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { loadProfileDetails } from "#src/routers/users/profileDetails";
import { writeEmailNotifications } from "#src/routers/users/setEmailNotifications";
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

describe("writeEmailNotifications", () => {
  it("starts on and reads back what the User set", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "set_email_notifications_user");
      expect(
        (await loadProfileDetails(db, appUser.id)).emailNotifications,
      ).toBe(true);

      expect(
        await writeEmailNotifications(db, {
          userId: appUser.id,
          emailNotifications: false,
        }),
      ).toEqual({ emailNotifications: false });
      expect(
        (await loadProfileDetails(db, appUser.id)).emailNotifications,
      ).toBe(false);

      await writeEmailNotifications(db, {
        userId: appUser.id,
        emailNotifications: true,
      });
      expect(
        (await loadProfileDetails(db, appUser.id)).emailNotifications,
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("changes only the User it is given", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const first = await insertUser(db, "set_email_notifications_first");
      const second = await insertUser(db, "set_email_notifications_second");

      await writeEmailNotifications(db, {
        userId: first.id,
        emailNotifications: false,
      });

      expect((await loadProfileDetails(db, first.id)).emailNotifications).toBe(
        false,
      );
      expect((await loadProfileDetails(db, second.id)).emailNotifications).toBe(
        true,
      );
    } finally {
      await close();
    }
  });
});
