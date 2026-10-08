import { describe, expect, it } from "vitest";

import {
  groups,
  NotificationTypeEnum,
  notifications,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { listNotifications } from "#src/routers/notifications/list";
import { unreadNotificationCount } from "#src/routers/notifications/unreadCount";

const DAY_MS = 24 * 60 * 60 * 1000;

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertGroup(
  database: TestDatabase,
  name: string,
  createdBy: string,
) {
  const [row] = await database
    .insert(groups)
    .values({ name, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

describe("notifications.list and notifications.unreadCount", () => {
  it("returns only the caller's rows, newest first, with names joined at read time", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "Me");
      const other = await insertUser(db, "Other");
      const actor = await insertUser(db, "Sara");
      const groupId = await insertGroup(db, "Sunday Crew", me);
      const now = Date.now();
      await db.insert(notifications).values([
        {
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          actorUserId: actor,
          groupId,
          createdAt: new Date(now - 2 * 60_000),
        },
        {
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          actorUserId: actor,
          groupId,
          createdAt: new Date(now - 1 * 60_000),
        },
        {
          recipientUserId: other,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          actorUserId: actor,
          groupId,
        },
      ]);

      const result = await listNotifications(db, { userId: me });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.createdAt.getTime()).toBeGreaterThan(
        result.items[1]!.createdAt.getTime(),
      );
      expect(result.items[0]).toMatchObject({
        type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
        audience: "admin",
        actor: { id: actor, name: "Sara" },
        group: { id: groupId, name: "Sunday Crew" },
        game: null,
        readAt: null,
      });
      expect(result.nextCursor).toBeNull();
    } finally {
      await close();
    }
  });

  it("paginates by cursor without repeating or skipping rows", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "Pager");
      const now = Date.now();
      await db.insert(notifications).values(
        Array.from({ length: 5 }, (_, index) => ({
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          createdAt: new Date(now - index * 60_000),
        })),
      );

      const first = await listNotifications(db, { userId: me, limit: 2 });
      expect(first.items).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();
      const second = await listNotifications(db, {
        userId: me,
        limit: 2,
        cursor: first.nextCursor!,
      });
      expect(second.items).toHaveLength(2);
      const third = await listNotifications(db, {
        userId: me,
        limit: 2,
        cursor: second.nextCursor!,
      });
      expect(third.items).toHaveLength(1);
      expect(third.nextCursor).toBeNull();

      const ids = [...first.items, ...second.items, ...third.items].map(
        (item) => item.id,
      );
      expect(new Set(ids).size).toBe(5);
    } finally {
      await close();
    }
  });

  it("ignores rows older than 90 days and counts only unread rows", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "Counter");
      const now = Date.now();
      await db.insert(notifications).values([
        {
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          createdAt: new Date(now - 91 * DAY_MS),
        },
        {
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          createdAt: new Date(now - 89 * DAY_MS),
        },
        {
          recipientUserId: me,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          readAt: new Date(now),
        },
      ]);

      const result = await listNotifications(db, { userId: me });
      expect(result.items).toHaveLength(2);
      expect(await unreadNotificationCount(db, { userId: me })).toEqual({
        count: 1,
      });
    } finally {
      await close();
    }
  });

  it("counts zero for a User with no Notifications", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const me = await insertUser(db, "Nobody");
      expect(await unreadNotificationCount(db, { userId: me })).toEqual({
        count: 0,
      });
    } finally {
      await close();
    }
  });
});
