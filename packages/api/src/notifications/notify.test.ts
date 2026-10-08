import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groups,
  GroupTypeEnum,
  NotificationAudienceEnum,
  NotificationTypeEnum,
  notifications,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { notify } from "#src/notifications/notify";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Crew", createdBy, type: GroupTypeEnum.PUBLIC })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

const admin = (userId: string) => ({
  userId,
  audience: NotificationAudienceEnum.ADMIN,
});
const player = (userId: string) => ({
  userId,
  audience: NotificationAudienceEnum.PLAYER,
});

describe("notify", () => {
  it("skips excluded users and writes one row per remaining recipient", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const a = await insertUser(db, "a@example.com");
      const b = await insertUser(db, "b@example.com");
      const c = await insertUser(db, "c@example.com");
      const group = await insertGroup(db, a.id);

      await notify(db, {
        type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
        recipients: [admin(a.id), admin(b.id)],
        excludeUserIds: [b.id],
        actorUserId: c.id,
        groupId: group.id,
      });

      const rows = await db.select().from(notifications);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        recipientUserId: a.id,
        actorUserId: c.id,
        groupId: group.id,
        audience: NotificationAudienceEnum.ADMIN,
        viaWaitlist: false,
        readAt: null,
      });
    } finally {
      await close();
    }
  });

  it("collapses duplicate recipients and lets admin beat player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const a = await insertUser(db, "dup-a@example.com");
      const b = await insertUser(db, "dup-b@example.com");

      await notify(db, {
        type: NotificationTypeEnum.GAME_FINISHED,
        recipients: [player(a.id), admin(a.id), player(b.id), player(b.id)],
        excludeUserIds: [],
      });

      const rows = await db.select().from(notifications);
      expect(rows).toHaveLength(2);
      const byRecipient = new Map(
        rows.map((row) => [row.recipientUserId, row.audience]),
      );
      expect(byRecipient.get(a.id)).toBe(NotificationAudienceEnum.ADMIN);
      expect(byRecipient.get(b.id)).toBe(NotificationAudienceEnum.PLAYER);
    } finally {
      await close();
    }
  });

  it("writes nothing when no recipient is left", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const a = await insertUser(db, "none-a@example.com");

      await notify(db, {
        type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
        recipients: [admin(a.id)],
        excludeUserIds: [a.id],
      });
      await notify(db, {
        type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
        recipients: [],
        excludeUserIds: [],
      });

      expect(await db.select().from(notifications)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("is idempotent for a repeated dedupe key", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const a = await insertUser(db, "key-a@example.com");
      const args = {
        type: NotificationTypeEnum.GAME_FINISHED,
        recipients: [admin(a.id)],
        excludeUserIds: [],
        dedupeKey: "game_finished:1",
      };

      await notify(db, args);
      await notify(db, args);

      expect(await db.select().from(notifications)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("purges only the recipients' rows older than the retention window", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const a = await insertUser(db, "purge-a@example.com");
      const b = await insertUser(db, "purge-b@example.com");
      const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      await db.insert(notifications).values([
        {
          recipientUserId: a.id,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          createdAt: old,
        },
        {
          recipientUserId: b.id,
          type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
          createdAt: old,
        },
      ]);

      await notify(db, {
        type: NotificationTypeEnum.GROUP_MEMBER_JOINED,
        recipients: [admin(a.id)],
        excludeUserIds: [],
      });

      const forA = await db.query.notifications.findMany({
        where: eq(notifications.recipientUserId, a.id),
      });
      const forB = await db.query.notifications.findMany({
        where: eq(notifications.recipientUserId, b.id),
      });
      expect(forA).toHaveLength(1);
      expect(forA[0]?.createdAt.getTime()).toBeGreaterThan(old.getTime());
      expect(forB).toHaveLength(1);
    } finally {
      await close();
    }
  });
});
