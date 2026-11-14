import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  groupMembers,
  groupTierPoints,
  groups,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { myGroupTiers } from "#src/routers/ratings/myGroupTiers";

async function insertUsers(database: TestDatabase, count: number) {
  return database
    .insert(user)
    .values(
      Array.from({ length: count }, (_, index) => ({
        name: `Player ${index + 1}`,
        email: `tiers-${index}-${crypto.randomUUID()}@example.com`,
      })),
    )
    .returning({ id: user.id });
}

async function insertGroup(
  database: TestDatabase,
  args: {
    name: string;
    createdBy: string;
    sport?: (typeof GroupSportEnum)[keyof typeof GroupSportEnum];
    verifiedAt?: Date;
    deletedAt?: Date;
    memberIds: readonly string[];
  },
) {
  const [group] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      sport: args.sport ?? GroupSportEnum.FOOTBALL,
      verifiedAt: args.verifiedAt ?? null,
      deletedAt: args.deletedAt ?? null,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values(args.memberIds.map((userId) => ({ groupId: group.id, userId })));
  return group.id;
}

describe("ratings.myGroupTiers", () => {
  it("lists one row per tier Group, never a Verified, padel or deleted Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const players = await insertUsers(db, 6);
      const ids = players.map((player) => player.id);
      const viewer = ids[0]!;
      const thursday = await insertGroup(db, {
        name: "Thursday Football",
        createdBy: viewer,
        memberIds: ids,
      });
      const friday = await insertGroup(db, {
        name: "Friday Football",
        createdBy: viewer,
        memberIds: ids.slice(0, 3),
      });
      await insertGroup(db, {
        name: "Verified Football",
        createdBy: viewer,
        verifiedAt: new Date(),
        memberIds: ids,
      });
      await insertGroup(db, {
        name: "Padel Crew",
        createdBy: viewer,
        sport: GroupSportEnum.PADEL,
        memberIds: ids,
      });
      await insertGroup(db, {
        name: "Gone Football",
        createdBy: viewer,
        deletedAt: new Date(),
        memberIds: ids,
      });
      await db.insert(groupTierPoints).values(
        ids.map((userId, index) => ({
          groupId: thursday,
          userId,
          points: [1260, 1320, 1240, 1200, 1180, 1100][index]!,
          gamesCounted: 5,
        })),
      );
      await db.insert(groupTierPoints).values({
        groupId: friday,
        userId: viewer,
        points: 1230,
        gamesCounted: 2,
      });

      const rows = await myGroupTiers(db as never, { userId: viewer });

      expect(rows).toEqual([
        {
          groupId: thursday,
          name: "Thursday Football",
          imageUrl: null,
          memberCount: 6,
          rankedCount: 6,
          band: "hamour",
          place: 2,
          points: 1260,
          provisional: false,
          gamesOfFive: 5,
        },
        {
          groupId: friday,
          name: "Friday Football",
          imageUrl: null,
          memberCount: 3,
          rankedCount: 0,
          band: null,
          place: null,
          points: 1230,
          provisional: true,
          gamesOfFive: 2,
        },
      ]);
    } finally {
      await close();
    }
  });

  it("reads a member with no Tier points as Provisional at the start", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [viewer, other] = await insertUsers(db, 2);
      const groupId = await insertGroup(db, {
        name: "New Football",
        createdBy: viewer!.id,
        memberIds: [viewer!.id, other!.id],
      });

      const rows = await myGroupTiers(db as never, { userId: viewer!.id });

      expect(rows).toEqual([
        expect.objectContaining({
          groupId,
          points: 1200,
          provisional: true,
          gamesOfFive: 0,
          place: null,
          band: null,
        }),
      ]);
    } finally {
      await close();
    }
  });

  it("shows a place without fish while fewer than two are ranked", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const players = await insertUsers(db, 3);
      const ids = players.map((player) => player.id);
      const groupId = await insertGroup(db, {
        name: "Small Football",
        createdBy: ids[0]!,
        memberIds: ids,
      });
      await db.insert(groupTierPoints).values(
        ids.map((userId, index) => ({
          groupId,
          userId,
          points: 1300 - index * 50,
          gamesCounted: index === 0 ? 6 : 2,
        })),
      );

      const [row] = await myGroupTiers(db as never, { userId: ids[0]! });

      expect(row).toMatchObject({ place: 1, band: null, rankedCount: 1 });
    } finally {
      await close();
    }
  });

  it("is empty for a User in no tier Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [viewer] = await insertUsers(db, 1);
      expect(await myGroupTiers(db as never, { userId: viewer!.id })).toEqual(
        [],
      );
    } finally {
      await close();
    }
  });
});
