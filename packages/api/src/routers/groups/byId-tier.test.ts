import { describe, expect, it } from "vitest";

import {
  groupMembers,
  groupTierEvents,
  groupTierPoints,
  groups,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupById } from "#src/routers/groups/byId";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function seedTierGroup(
  database: TestDatabase,
  options: { verified?: boolean } = {},
) {
  const owner = await insertUser(database, "owner");
  const [group] = await database
    .insert(groups)
    .values({
      name: "Thursday Football",
      createdBy: owner,
      sport: "football",
      verifiedAt: options.verified ? new Date() : null,
    })
    .returning({ id: groups.id });
  const groupId = group!.id;
  const ranked: Record<string, number> = {
    shark: 1412,
    hamour: 1356,
    kanaad: 1248,
    safi: 1098,
  };
  const ids: Record<string, string> = { owner };
  for (const name of [...Object.keys(ranked), "newcomer", "silent"]) {
    ids[name] = await insertUser(database, name);
  }
  await database
    .insert(groupMembers)
    .values(Object.values(ids).map((userId) => ({ groupId, userId })));
  await database.insert(groupTierPoints).values([
    ...Object.entries(ranked).map(([name, points]) => ({
      groupId,
      userId: ids[name]!,
      points,
      gamesCounted: 8,
    })),
    { groupId, userId: owner, points: 1201, gamesCounted: 6 },
    { groupId, userId: ids.newcomer!, points: 1240, gamesCounted: 3 },
  ]);
  const since = new Date(Date.now() - 36 * 24 * 60 * 60 * 1000);
  await database.insert(groupTierEvents).values({
    groupId,
    userId: ids.shark!,
    kind: "band_change",
    pointsBefore: 1400,
    pointsAfter: 1400,
    bandBefore: "hamour",
    bandAfter: "shark",
    createdAt: since,
  });
  return { groupId, ids, since };
}

function tierOf(result: Awaited<ReturnType<typeof groupById>>, userId: string) {
  return result.standing.leaderboard.find((entry) => entry.userId === userId)
    ?.tier;
}

describe("groups.byId on a tier Group (screen 2b)", () => {
  it("gives every member a tier and the Shark card", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids, since } = await seedTierGroup(db);
      const result = await groupById(db, {
        groupId,
        userId: ids.owner!,
      });

      expect(result.hasTier).toBe(true);
      expect(result.tierSummary).toEqual({
        shark: { userId: ids.shark, name: "shark", points: 1412, since },
        rankedCount: 5,
        provisionalCount: 2,
      });
      expect(tierOf(result, ids.shark!)).toEqual({
        band: "shark",
        place: 1,
        points: 1412,
        provisional: false,
        gamesOfFive: 5,
        gamesCounted: 8,
      });
      expect(tierOf(result, ids.owner!)).toMatchObject({
        place: 4,
        band: "safi",
      });
      expect(tierOf(result, ids.newcomer!)).toEqual({
        band: null,
        place: null,
        points: 1240,
        provisional: true,
        gamesOfFive: 3,
        gamesCounted: 3,
      });
      expect(tierOf(result, ids.silent!)).toEqual({
        band: null,
        place: null,
        points: 1200,
        provisional: true,
        gamesOfFive: 0,
        gamesCounted: 0,
      });
    } finally {
      await close();
    }
  });

  it("hides a Provisional member's points from other members", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids } = await seedTierGroup(db);
      const asMember = await groupById(db, { groupId, userId: ids.safi! });
      expect(tierOf(asMember, ids.newcomer!)?.points).toBeNull();
      expect(tierOf(asMember, ids.kanaad!)?.points).toBe(1248);

      const asSelf = await groupById(db, { groupId, userId: ids.newcomer! });
      expect(tierOf(asSelf, ids.newcomer!)?.points).toBe(1240);
    } finally {
      await close();
    }
  });

  it("shows no tier on a football Group that is Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { groupId, ids } = await seedTierGroup(db, { verified: true });
      const result = await groupById(db, { groupId, userId: ids.owner! });
      expect(result.hasTier).toBe(false);
      expect(result.tierSummary).toBeNull();
      expect(
        result.standing.leaderboard.every((entry) => entry.tier === null),
      ).toBe(true);
    } finally {
      await close();
    }
  });
});
