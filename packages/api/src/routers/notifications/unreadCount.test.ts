import { describe, expect, it } from "vitest";

import { notifications, user } from "@repo/db/schema";

import { countUnreadNotifications } from "#src/routers/notifications/unreadCount";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-07T12:00:00.000Z");

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

describe("notifications.unreadCount", () => {
  it("counts the caller's unread rows inside 90 days", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "unread-caller@example.com");
      const other = await insertUser(db, "unread-other@example.com");
      const recent = new Date(NOW.getTime() - DAY_MS);
      await db.insert(notifications).values([
        {
          recipientUserId: caller,
          type: "group_member_joined",
          createdAt: recent,
        },
        {
          recipientUserId: caller,
          type: "group_member_joined",
          createdAt: recent,
        },
        {
          recipientUserId: caller,
          type: "group_member_joined",
          createdAt: recent,
          readAt: NOW,
        },
        {
          recipientUserId: caller,
          type: "group_member_joined",
          createdAt: new Date(NOW.getTime() - 91 * DAY_MS),
        },
        {
          recipientUserId: other,
          type: "group_member_joined",
          createdAt: recent,
        },
      ]);

      expect(
        await countUnreadNotifications(db, { userId: caller, now: NOW }),
      ).toEqual({ count: 2 });
    } finally {
      await close();
    }
  });

  it("is zero with no rows", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "unread-empty@example.com");

      expect(
        await countUnreadNotifications(db, { userId: caller, now: NOW }),
      ).toEqual({ count: 0 });
    } finally {
      await close();
    }
  });
});
