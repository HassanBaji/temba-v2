import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  groupMembers,
  groups,
  user,
} from "@repo/db/schema";

import { loadMemberPhone } from "#src/routers/users/memberPhone";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(
  database: TestDatabase,
  name: string,
  phoneNumber?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}@example.com`, phoneNumber })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Thursday padel", createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

async function seed(database: TestDatabase) {
  const creator = await insertUser(database, "creator", "+97336110000");
  const organizer = await insertUser(database, "organizer", "+97336110001");
  const member = await insertUser(database, "member", "+97336110002");
  const outsider = await insertUser(database, "outsider", "+97336110003");
  const groupId = await insertGroup(database, creator);
  await database.insert(groupMembers).values([
    { groupId, userId: creator },
    {
      groupId,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId, userId: member },
  ]);
  const otherGroupId = await insertGroup(database, outsider);
  await database
    .insert(groupMembers)
    .values({ groupId: otherGroupId, userId: outsider });
  return { creator, organizer, member, outsider, groupId };
}

describe("users.memberPhone", () => {
  it("gives a member's number to the Group creator and its Appointed Organizers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await expect(
        loadMemberPhone(db, { viewerId: f.creator, playerId: f.member }),
      ).resolves.toEqual({ phoneNumber: "+97336110002" });
      await expect(
        loadMemberPhone(db, { viewerId: f.organizer, playerId: f.member }),
      ).resolves.toEqual({ phoneNumber: "+97336110002" });
      await expect(
        loadMemberPhone(db, { viewerId: f.organizer, playerId: f.creator }),
      ).resolves.toEqual({ phoneNumber: "+97336110000" });
    } finally {
      await close();
    }
  });

  it("gives nothing to a member, to the player themselves, or about someone outside the approver's Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      for (const args of [
        { viewerId: f.member, playerId: f.organizer },
        { viewerId: f.member, playerId: f.member },
        { viewerId: f.creator, playerId: f.creator },
        { viewerId: f.creator, playerId: f.outsider },
        { viewerId: f.outsider, playerId: f.member },
      ]) {
        await expect(loadMemberPhone(db, args)).resolves.toEqual({
          phoneNumber: null,
        });
      }
    } finally {
      await close();
    }
  });

  it("stops once the Group is deleted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await db
        .update(groups)
        .set({ deletedAt: new Date() })
        .where(eq(groups.id, f.groupId));
      await expect(
        loadMemberPhone(db, { viewerId: f.creator, playerId: f.member }),
      ).resolves.toEqual({ phoneNumber: null });
    } finally {
      await close();
    }
  });
});
