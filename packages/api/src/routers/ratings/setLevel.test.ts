import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  groupMembers,
  groups,
  levelOverrides,
  ratings,
  user,
} from "@repo/db/schema";

import { loadRatingsMe } from "#src/routers/ratings/me";
import { setMemberLevel } from "#src/routers/ratings/setLevel";
import { INITIAL_MU, muFromLevel } from "@repo/domain/level";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

async function insertGroup(
  database: TestDatabase,
  args: { memberIds: string[]; sport?: GroupSportEnum | null },
) {
  const [creator] = args.memberIds;
  if (!creator) {
    throw new Error("A Group needs a creator");
  }
  const [row] = await database
    .insert(groups)
    .values({
      name: "Friday Night",
      createdBy: creator,
      sport: args.sport === undefined ? GroupSportEnum.PADEL : args.sport,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of args.memberIds) {
    await database.insert(groupMembers).values({ groupId: row.id, userId });
  }
  return row;
}

async function setUp(database: TestDatabase) {
  const setter = await insertUser(database, "setter");
  const target = await insertUser(database, "target");
  const outsider = await insertUser(database, "outsider");
  const group = await insertGroup(database, {
    memberIds: [setter.id, target.id],
  });
  return { setter, target, outsider, group };
}

async function ratingFor(database: TestDatabase, userId: string) {
  return database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, userId),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });
}

async function overridesFor(database: TestDatabase, userId: string) {
  return database.query.levelOverrides.findMany({
    where: eq(levelOverrides.userId, userId),
    orderBy: [asc(levelOverrides.createdAt), asc(levelOverrides.id)],
  });
}

describe("setMemberLevel", () => {
  it("writes a confirmed baseline and an audit row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);
      const lastRatedAt = new Date("2026-09-01T10:00:00Z");
      await db.insert(ratings).values({
        userId: target.id,
        sport: GroupSportEnum.PADEL,
        mu: muFromLevel(2.4),
        phi: 320,
        sigma: 0.055,
        levelBand: "C3",
        lastRatedAt,
      });

      const result = await setMemberLevel(db, {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
        levelTenths: 46,
        reason: "back_from_injury",
      });

      const row = await ratingFor(db, target.id);
      expect(row?.mu).toBeCloseTo(muFromLevel(4.6), 9);
      expect(row?.levelBand).toBe("B3");
      expect(row?.phi).toBe(150);
      expect(row?.sigma).toBe(0.055);
      expect(row?.lastRatedAt).toEqual(lastRatedAt);

      const [audit] = await overridesFor(db, target.id);
      expect(audit).toMatchObject({
        id: result.overrideId,
        userId: target.id,
        sport: GroupSportEnum.PADEL,
        setByUserId: setter.id,
        groupId: group.id,
        reason: "back_from_injury",
        hadRating: true,
        phiBefore: 320,
        sigmaBefore: 0.055,
        levelBandBefore: "C3",
        phiAfter: 150,
        sigmaAfter: 0.055,
        levelBandAfter: "B3",
      });
      expect(audit?.muBefore).toBeCloseTo(muFromLevel(2.4), 9);
      expect(audit?.muAfter).toBeCloseTo(muFromLevel(4.6), 9);
      expect(result.level).toEqual({
        level: "4.6",
        levelBand: "B3",
        provisional: false,
      });
    } finally {
      await close();
    }
  });

  it("never raises a φ that is already below the ceiling", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);
      await db.insert(ratings).values({
        userId: target.id,
        sport: GroupSportEnum.PADEL,
        mu: INITIAL_MU,
        phi: 90,
        sigma: 0.06,
        levelBand: "C2",
      });

      await setMemberLevel(db, {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
        levelTenths: 30,
      });

      expect((await ratingFor(db, target.id))?.phi).toBe(90);
      expect((await overridesFor(db, target.id))[0]?.reason).toBeNull();
    } finally {
      await close();
    }
  });

  it("creates the Rating row for a target without one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);

      await setMemberLevel(db, {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
        levelTenths: 55,
      });

      const row = await ratingFor(db, target.id);
      expect(row).toMatchObject({ phi: 150, sigma: 0.06, levelBand: "B2" });
      expect(row?.lastRatedAt).toBeNull();
      const [audit] = await overridesFor(db, target.id);
      expect(audit).toMatchObject({
        hadRating: false,
        muBefore: 1500,
        phiBefore: 350,
        sigmaBefore: 0.06,
        levelBandBefore: "C2",
      });
    } finally {
      await close();
    }
  });

  it("sets again: a second audit row and a moved Rating", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);
      const args = {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
      };

      await setMemberLevel(db, { ...args, levelTenths: 55 });
      await setMemberLevel(db, {
        ...args,
        levelTenths: 45,
        reason: "correcting_a_mistake",
      });

      const row = await ratingFor(db, target.id);
      expect(row?.mu).toBeCloseTo(muFromLevel(4.5), 9);
      expect(row?.phi).toBe(150);
      const audits = await overridesFor(db, target.id);
      expect(audits).toHaveLength(2);
      expect(audits[1]).toMatchObject({
        hadRating: true,
        reason: "correcting_a_mistake",
        levelBandBefore: "B2",
      });
      expect(audits[1]?.muBefore).toBeCloseTo(muFromLevel(5.5), 9);
    } finally {
      await close();
    }
  });

  it("allows the same value, which confirms a Provisional Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);
      await db.insert(ratings).values({
        userId: target.id,
        sport: GroupSportEnum.PADEL,
        mu: muFromLevel(3),
        phi: 350,
        sigma: 0.06,
        levelBand: "C2",
      });

      await setMemberLevel(db, {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
        levelTenths: 30,
      });

      const row = await ratingFor(db, target.id);
      expect(row?.phi).toBe(150);
      expect(row?.mu).toBeCloseTo(1500, 9);
    } finally {
      await close();
    }
  });

  it("shows on the next ratings.me fetch as an ordinary confirmed Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { setter, target, group } = await setUp(db);

      await setMemberLevel(db, {
        groupId: group.id,
        setterUserId: setter.id,
        targetUserId: target.id,
        levelTenths: 46,
      });

      const me = await loadRatingsMe(db, { userId: target.id });
      expect(me.rating).toMatchObject({
        level: "4.6",
        levelBand: "B3",
        provisional: false,
      });
      expect(me.canSelfDeclare).toBe(false);
      expect(me.ratedMatchCount).toBe(0);
    } finally {
      await close();
    }
  });

  describe("refusals", () => {
    it("refuses a setter who is not a member", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const { outsider, target, group } = await setUp(db);
        await expect(
          setMemberLevel(db, {
            groupId: group.id,
            setterUserId: outsider.id,
            targetUserId: target.id,
            levelTenths: 40,
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      } finally {
        await close();
      }
    });

    it("refuses a target who is not a member", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const { setter, outsider, group } = await setUp(db);
        await expect(
          setMemberLevel(db, {
            groupId: group.id,
            setterUserId: setter.id,
            targetUserId: outsider.id,
            levelTenths: 40,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(await ratingFor(db, outsider.id)).toBeUndefined();
      } finally {
        await close();
      }
    });

    it("refuses the setter setting their own Level", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const { setter, group } = await setUp(db);
        await expect(
          setMemberLevel(db, {
            groupId: group.id,
            setterUserId: setter.id,
            targetUserId: setter.id,
            levelTenths: 40,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      } finally {
        await close();
      }
    });

    it("refuses a Group with no sport", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const setter = await insertUser(db, "setter");
        const target = await insertUser(db, "target");
        const group = await insertGroup(db, {
          memberIds: [setter.id, target.id],
          sport: null,
        });
        await expect(
          setMemberLevel(db, {
            groupId: group.id,
            setterUserId: setter.id,
            targetUserId: target.id,
            levelTenths: 40,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      } finally {
        await close();
      }
    });

    it("refuses a missing Group", async () => {
      const { db, close } = await createPgliteDb();
      try {
        const { setter, target } = await setUp(db);
        await expect(
          setMemberLevel(db, {
            groupId: crypto.randomUUID(),
            setterUserId: setter.id,
            targetUserId: target.id,
            levelTenths: 40,
          }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      } finally {
        await close();
      }
    });

    it.each([-1, 71, 3.5])("refuses %s tenths", async (levelTenths) => {
      const { db, close } = await createPgliteDb();
      try {
        const { setter, target, group } = await setUp(db);
        await expect(
          setMemberLevel(db, {
            groupId: group.id,
            setterUserId: setter.id,
            targetUserId: target.id,
            levelTenths,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(await overridesFor(db, target.id)).toHaveLength(0);
      } finally {
        await close();
      }
    });
  });
});
