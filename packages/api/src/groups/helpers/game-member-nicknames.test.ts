import { describe, expect, it } from "vitest";

import { groupMembers, GroupMemberRoleEnum, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { gameMemberNicknames } from "#src/groups/helpers/game-member-nicknames";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { setMemberNickname } from "#src/routers/groups/setMemberNickname";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function seed(database: TestDatabase) {
  const creator = await insertUser(database, "Hassan Ali");
  const organizer = await insertUser(database, "Yousif Kadhem");
  const keeper = await insertUser(database, "Ahmed Nasser");
  const defender = await insertUser(database, "Ahmed Buhazza");
  const outsider = await insertUser(database, "Salman H");
  const group = await createLoosePrivate(database, {
    name: "Karbabad Friday Football",
    sport: "football",
    userId: creator,
  });
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: keeper },
    { groupId: group.id, userId: defender },
  ]);
  const base = { groupId: group.id, approverUserId: creator };
  await setMemberNickname(database, {
    ...base,
    userId: keeper,
    nickname: "Ahmed keeper",
    visibility: "group",
  });
  await setMemberNickname(database, {
    ...base,
    userId: defender,
    nickname: "Abu Ali",
    visibility: "approvers",
  });
  return { creator, organizer, keeper, defender, outsider, groupId: group.id };
}

describe("gameMemberNicknames", () => {
  it("gives an Organizer every nickname on a Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const names = await gameMemberNicknames(
        db,
        { groupId: f.groupId },
        f.organizer,
      );
      expect(Object.fromEntries(names)).toEqual({
        [f.keeper]: { name: "Ahmed keeper", visibility: "group" },
        [f.defender]: { name: "Abu Ali", visibility: "approvers" },
      });
    } finally {
      await close();
    }
  });

  it("gives a member only the names set for the whole Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const names = await gameMemberNicknames(
        db,
        { groupId: f.groupId },
        f.defender,
      );
      expect([...names.keys()]).toEqual([f.keeper]);
    } finally {
      await close();
    }
  });

  it("shows none on a Game with no Group, or to someone outside the Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const sizes = await Promise.all([
        gameMemberNicknames(db, { groupId: null }, f.creator),
        gameMemberNicknames(db, { groupId: f.groupId }, f.outsider),
      ]);
      expect(sizes.map((names) => names.size)).toEqual([0, 0]);
    } finally {
      await close();
    }
  });
});
