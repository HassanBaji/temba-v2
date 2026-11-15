import { describe, expect, it } from "vitest";

import { groupMembers, GroupMemberRoleEnum, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { gameMemberPhoneNumbers } from "#src/groups/helpers/game-member-phone-numbers";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";

async function insertUser(
  database: TestDatabase,
  name: string,
  phoneNumber: string | null,
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
      phoneNumber,
    })
    .returning({ id: user.id, phoneNumber: user.phoneNumber });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function seed(database: TestDatabase) {
  const creator = await insertUser(database, "Hassan Ali", "+97333000001");
  const organizer = await insertUser(database, "Yousif Kadhem", "+97333000002");
  const member = await insertUser(database, "Ahmed Nasser", "+97336124408");
  const noNumber = await insertUser(database, "Ahmed Buhazza", null);
  const outsider = await insertUser(database, "Salman H", "+97333000005");
  const group = await createLoosePrivate(database, {
    name: "Karbabad Friday Football",
    sport: "football",
    userId: creator.id,
  });
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer.id,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member.id },
    { groupId: group.id, userId: noNumber.id },
  ]);
  return {
    creator,
    organizer,
    member,
    noNumber,
    outsider,
    groupId: group.id,
    players: [creator, organizer, member, noNumber, outsider],
  };
}

describe("gameMemberPhoneNumbers", () => {
  it("gives the Group creator every other member's number", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const numbers = await gameMemberPhoneNumbers(
        db,
        { groupId: f.groupId, challengeId: null },
        f.creator.id,
        f.players,
      );
      expect(Object.fromEntries(numbers)).toEqual({
        [f.organizer.id]: "+97333000002",
        [f.member.id]: "+97336124408",
      });
    } finally {
      await close();
    }
  });

  it("gives an Appointed Organizer the members' numbers too", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const numbers = await gameMemberPhoneNumbers(
        db,
        { groupId: f.groupId, challengeId: null },
        f.organizer.id,
        f.players,
      );
      expect(numbers.get(f.member.id)).toBe("+97336124408");
      expect(numbers.has(f.organizer.id)).toBe(false);
      expect(numbers.has(f.outsider.id)).toBe(false);
    } finally {
      await close();
    }
  });

  it("gives a member no numbers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const numbers = await gameMemberPhoneNumbers(
        db,
        { groupId: f.groupId, challengeId: null },
        f.member.id,
        f.players,
      );
      expect(numbers.size).toBe(0);
    } finally {
      await close();
    }
  });

  it("gives no numbers on a Game outside a Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const numbers = await gameMemberPhoneNumbers(
        db,
        { groupId: null, challengeId: null },
        f.creator.id,
        f.players,
      );
      expect(numbers.size).toBe(0);
    } finally {
      await close();
    }
  });
});
