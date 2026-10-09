import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notifications, user } from "@repo/db/schema";

import { markAllNotificationsRead } from "#src/routers/notifications/markAllRead";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const MINUTE_MS = 60 * 1000;

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertNotification(
  database: TestDatabase,
  recipient: string,
  createdAt: Date,
) {
  const [row] = await database
    .insert(notifications)
    .values({
      recipientUserId: recipient,
      type: "group_member_joined",
      createdAt,
    })
    .returning({ id: notifications.id });
  if (!row) {
    throw new Error("Failed to insert notification");
  }
  return row.id;
}

async function readAtOf(database: TestDatabase, id: string) {
  const row = await database.query.notifications.findFirst({
    where: eq(notifications.id, id),
    columns: { readAt: true },
  });
  return row?.readAt ?? null;
}

describe("notifications.markAllRead", () => {
  it("marks every unread row up to the cursor and leaves a later row unread", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "all-caller@example.com");
      const upTo = new Date(NOW.getTime() - 10 * MINUTE_MS);
      const older = await insertNotification(
        db,
        caller,
        new Date(upTo.getTime() - MINUTE_MS),
      );
      const newestLoaded = await insertNotification(db, caller, upTo);
      const arrivedAfter = await insertNotification(
        db,
        caller,
        new Date(upTo.getTime() + 1),
      );

      expect(
        await markAllNotificationsRead(db, { userId: caller, upTo, now: NOW }),
      ).toEqual({ updated: 2 });
      expect(await readAtOf(db, older)).toEqual(NOW);
      expect(await readAtOf(db, newestLoaded)).toEqual(NOW);
      expect(await readAtOf(db, arrivedAfter)).toBeNull();
    } finally {
      await close();
    }
  });

  it("leaves another User's rows unread", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "all-own@example.com");
      const other = await insertUser(db, "all-other@example.com");
      const theirs = await insertNotification(
        db,
        other,
        new Date(NOW.getTime() - MINUTE_MS),
      );

      expect(
        await markAllNotificationsRead(db, {
          userId: caller,
          upTo: NOW,
          now: NOW,
        }),
      ).toEqual({ updated: 0 });
      expect(await readAtOf(db, theirs)).toBeNull();
    } finally {
      await close();
    }
  });
});
