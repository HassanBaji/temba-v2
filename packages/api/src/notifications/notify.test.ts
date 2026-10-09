import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, GroupTypeEnum, notifications, user } from "@repo/db/schema";

import { notify } from "#src/notifications/notify";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const DAY_MS = 24 * 60 * 60 * 1000;

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

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Notify Group", type: GroupTypeEnum.PUBLIC, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

async function rowsFor(database: TestDatabase, userId: string) {
  return database.query.notifications.findMany({
    where: eq(notifications.recipientUserId, userId),
  });
}

describe("notify", () => {
  it("writes one row per recipient and skips excluded Users", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const actor = await insertUser(db, "notify-actor@example.com");
      const admin = await insertUser(db, "notify-admin@example.com");
      const groupId = await insertGroup(db, admin);

      await notify(db, {
        type: "group_member_joined",
        recipients: [
          { userId: admin, audience: "admin" },
          { userId: actor, audience: "admin" },
        ],
        excludeUserIds: [actor],
        actorUserId: actor,
        groupId,
      });

      expect(await rowsFor(db, actor)).toEqual([]);
      const [row] = await rowsFor(db, admin);
      expect(row).toMatchObject({
        type: "group_member_joined",
        audience: "admin",
        actorUserId: actor,
        groupId,
        gameId: null,
        viaWaitlist: false,
        readAt: null,
      });
    } finally {
      await close();
    }
  });

  it("collapses duplicates into one row with admin beating player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const both = await insertUser(db, "notify-both@example.com");
      const player = await insertUser(db, "notify-player@example.com");

      await notify(db, {
        type: "game_finished",
        recipients: [
          { userId: both, audience: "player" },
          { userId: both, audience: "admin" },
          { userId: both, audience: "player" },
          { userId: player, audience: "player" },
          { userId: player, audience: "player" },
        ],
        excludeUserIds: [],
      });

      expect((await rowsFor(db, both)).map((row) => row.audience)).toEqual([
        "admin",
      ]);
      expect((await rowsFor(db, player)).map((row) => row.audience)).toEqual([
        "player",
      ]);
    } finally {
      await close();
    }
  });

  it("writes nothing when every recipient is excluded", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const only = await insertUser(db, "notify-only@example.com");

      await notify(db, {
        type: "group_member_joined",
        recipients: [{ userId: only, audience: "admin" }],
        excludeUserIds: [only],
      });
      await notify(db, {
        type: "group_member_joined",
        recipients: [],
        excludeUserIds: [],
      });

      expect(await db.query.notifications.findMany()).toEqual([]);
    } finally {
      await close();
    }
  });

  it("writes a keyed row once per recipient", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const recipient = await insertUser(db, "notify-keyed@example.com");
      const args = {
        type: "game_finished" as const,
        recipients: [{ userId: recipient, audience: "admin" as const }],
        excludeUserIds: [],
        dedupeKey: "game_finished:fixture",
      };

      await notify(db, args);
      await notify(db, args);

      expect(await rowsFor(db, recipient)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("purges only its recipients' rows older than 90 days", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const recipient = await insertUser(db, "notify-purge@example.com");
      const bystander = await insertUser(db, "notify-bystander@example.com");
      const now = Date.now();
      await db.insert(notifications).values([
        {
          recipientUserId: recipient,
          type: "group_member_joined",
          createdAt: new Date(now - 91 * DAY_MS),
        },
        {
          recipientUserId: recipient,
          type: "group_member_joined",
          createdAt: new Date(now - 89 * DAY_MS),
        },
        {
          recipientUserId: bystander,
          type: "group_member_joined",
          createdAt: new Date(now - 91 * DAY_MS),
        },
      ]);

      await notify(db, {
        type: "group_member_joined",
        recipients: [{ userId: recipient, audience: "admin" }],
        excludeUserIds: [],
      });

      const kept = await rowsFor(db, recipient);
      expect(kept).toHaveLength(2);
      expect(
        kept.every((row) => row.createdAt.getTime() > now - 90 * DAY_MS),
      ).toBe(true);
      expect(await rowsFor(db, bystander)).toHaveLength(1);
    } finally {
      await close();
    }
  });
});
