import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, GroupTypeEnum, notifications, user } from "@repo/db/schema";

import { listNotifications } from "#src/routers/notifications/list";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-07T12:00:00.000Z");

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
  createdBy: string,
  name: string,
) {
  const [row] = await database
    .insert(groups)
    .values({ name, type: GroupTypeEnum.PUBLIC, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

async function insertJoined(
  database: TestDatabase,
  args: {
    recipient: string;
    actor: string;
    groupId: string;
    createdAt?: Date;
  },
) {
  const [row] = await database
    .insert(notifications)
    .values({
      recipientUserId: args.recipient,
      type: "group_member_joined",
      actorUserId: args.actor,
      groupId: args.groupId,
      createdAt: args.createdAt,
    })
    .returning({ id: notifications.id });
  if (!row) {
    throw new Error("Failed to insert notification");
  }
  return row.id;
}

describe("notifications.list", () => {
  it("returns only the caller's rows, newest first, with names joined at read time", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const approver = await insertUser(db, "Approver");
      const other = await insertUser(db, "Other");
      const joiner = await insertUser(db, "Joiner");
      const groupId = await insertGroup(db, approver, "Night Crew");
      const older = await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 2 * DAY_MS),
      });
      const newer = await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 60_000),
      });
      await insertJoined(db, {
        recipient: other,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 60_000),
      });

      const page = await listNotifications(db, { userId: approver, now: NOW });

      expect(page.items.map((item) => item.id)).toEqual([newer, older]);
      expect(page.nextCursor).toBeNull();
      expect(page.items[0]).toMatchObject({
        type: "group_member_joined",
        audience: "admin",
        readAt: null,
        viaWaitlist: false,
        actor: { id: joiner, name: "Joiner", image: null },
        partner: null,
        team: null,
        group: { id: groupId, name: "Night Crew" },
        game: null,
      });
    } finally {
      await close();
    }
  });

  it("shows a renamed Group by its current name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const approver = await insertUser(db, "Approver");
      const joiner = await insertUser(db, "Joiner");
      const groupId = await insertGroup(db, approver, "Old Name");
      await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 60_000),
      });
      await db.update(groups).set({ name: "New Name" });

      const page = await listNotifications(db, { userId: approver, now: NOW });

      expect(page.items[0]?.group?.name).toBe("New Name");
    } finally {
      await close();
    }
  });

  it("pages through database-stamped rows without skipping any", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const approver = await insertUser(db, "Approver");
      const joiner = await insertUser(db, "Joiner");
      const groupId = await insertGroup(db, approver, "Busy Crew");
      const inserted: string[] = [];
      for (let index = 0; index < 7; index += 1) {
        inserted.push(
          await insertJoined(db, {
            recipient: approver,
            actor: joiner,
            groupId,
          }),
        );
      }

      const seen: string[] = [];
      let cursor: { createdAt: Date; id: string } | undefined;
      for (let pageIndex = 0; pageIndex < 7; pageIndex += 1) {
        const page = await listNotifications(db, {
          userId: approver,
          cursor,
          limit: 2,
        });
        seen.push(...page.items.map((item) => item.id));
        if (!page.nextCursor) {
          break;
        }
        cursor = page.nextCursor;
      }

      expect(seen).toHaveLength(7);
      expect(new Set(seen)).toEqual(new Set(inserted));
    } finally {
      await close();
    }
  });

  it("leaves out rows older than 90 days", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const approver = await insertUser(db, "Approver");
      const joiner = await insertUser(db, "Joiner");
      const groupId = await insertGroup(db, approver, "Old Crew");
      const kept = await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 89 * DAY_MS),
      });
      await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 91 * DAY_MS),
      });

      const page = await listNotifications(db, { userId: approver, now: NOW });

      expect(page.items.map((item) => item.id)).toEqual([kept]);
    } finally {
      await close();
    }
  });

  it("returns a null actor once the actor's account is deleted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const approver = await insertUser(db, "Approver");
      const joiner = await insertUser(db, "Joiner");
      const groupId = await insertGroup(db, approver, "Crew");
      await insertJoined(db, {
        recipient: approver,
        actor: joiner,
        groupId,
        createdAt: new Date(NOW.getTime() - 60_000),
      });
      await db.delete(user).where(eq(user.id, joiner));

      const page = await listNotifications(db, { userId: approver, now: NOW });

      expect(page.items[0]?.actor).toBeNull();
    } finally {
      await close();
    }
  });
});
