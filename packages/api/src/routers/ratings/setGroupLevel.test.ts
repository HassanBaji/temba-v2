import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  groupLevelOverrides,
  groupMembers,
  groups,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { setGroupLevelForMember } from "#src/routers/ratings/setGroupLevel";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function setUp(database: TestDatabase) {
  const organizer = await insertUser(database, "organizer");
  const member = await insertUser(database, "member");
  const [group] = await database
    .insert(groups)
    .values({
      name: "Friday Night",
      createdBy: organizer.id,
      sport: GroupSportEnum.PADEL,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  for (const userId of [organizer.id, member.id]) {
    await database.insert(groupMembers).values({ groupId: group.id, userId });
  }
  return { organizer, member, group };
}

describe("ratings.setGroupLevel", () => {
  it("refuses an Organizer setting their own Group Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, group } = await setUp(db);
      await expect(
        setGroupLevelForMember(db, {
          groupId: group.id,
          setterUserId: organizer.id,
          targetUserId: organizer.id,
          levelTenths: 50,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "You cannot set your own Group Level",
      });
      expect(
        await db.query.groupLevelOverrides.findMany({
          where: eq(groupLevelOverrides.groupId, group.id),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("sets another member's Group Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, member, group } = await setUp(db);
      await setGroupLevelForMember(db, {
        groupId: group.id,
        setterUserId: organizer.id,
        targetUserId: member.id,
        levelTenths: 50,
      });
      expect(
        await db.query.groupLevelOverrides.findMany({
          where: eq(groupLevelOverrides.groupId, group.id),
        }),
      ).toMatchObject([{ userId: member.id, setByUserId: organizer.id }]);
    } finally {
      await close();
    }
  });
});
