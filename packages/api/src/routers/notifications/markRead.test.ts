import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notifications, user } from "@repo/db/schema";

import { markNotificationsRead } from "#src/routers/notifications/markRead";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const EARLIER = new Date("2026-10-06T12:00:00.000Z");

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
  readAt: Date | null = null,
) {
  const [row] = await database
    .insert(notifications)
    .values({ recipientUserId: recipient, type: "group_member_joined", readAt })
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

describe("notifications.markRead", () => {
  it("marks the caller's own unread rows read", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "mark-caller@example.com");
      const first = await insertNotification(db, caller);
      const second = await insertNotification(db, caller);
      const untouched = await insertNotification(db, caller);

      expect(
        await markNotificationsRead(db, {
          userId: caller,
          ids: [first, second],
          now: NOW,
        }),
      ).toEqual({ updated: 2 });
      expect(await readAtOf(db, first)).toEqual(NOW);
      expect(await readAtOf(db, second)).toEqual(NOW);
      expect(await readAtOf(db, untouched)).toBeNull();
    } finally {
      await close();
    }
  });

  it("silently ignores another User's rows", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "mark-own@example.com");
      const other = await insertUser(db, "mark-other@example.com");
      const theirs = await insertNotification(db, other);

      expect(
        await markNotificationsRead(db, {
          userId: caller,
          ids: [theirs],
          now: NOW,
        }),
      ).toEqual({ updated: 0 });
      expect(await readAtOf(db, theirs)).toBeNull();
    } finally {
      await close();
    }
  });

  it("keeps the first read time of a row that is already read", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "mark-again@example.com");
      const read = await insertNotification(db, caller, EARLIER);

      expect(
        await markNotificationsRead(db, {
          userId: caller,
          ids: [read],
          now: NOW,
        }),
      ).toEqual({ updated: 0 });
      expect(await readAtOf(db, read)).toEqual(EARLIER);
    } finally {
      await close();
    }
  });
});
