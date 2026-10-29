import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GroupSportEnum, levelOverrides, ratings, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { listForOperator } from "#src/routers/ratings/listForOperator";
import { setLevelAsOperator } from "#src/routers/ratings/setLevelAsOperator";
import { muFromLevel } from "@repo/domain/level";

async function insertUser(
  database: TestDatabase,
  name: string,
  extra: Partial<typeof user.$inferInsert> = {},
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`,
      ...extra,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function ratingFor(
  database: TestDatabase,
  userId: string,
  sport: GroupSportEnum,
) {
  return database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
  });
}

function callerFor(metadata: Record<string, unknown> | undefined) {
  return createCaller(() =>
    createTRPCContext({
      db: {} as Parameters<typeof createTRPCContext>[0]["db"],
      userId: "user_clerk",
      getPublicMetadata: async () => metadata,
      headers: new Headers(),
      webOrigin: "https://temba.example",
    }),
  );
}

describe("Operator Level doors", () => {
  it.each([undefined, {}, { operator: false }, { levelSetter: true }])(
    "refuse callers who are not Operators (%j)",
    async (metadata) => {
      const caller = callerFor(metadata);
      await expect(
        caller.ratings.setLevelAsOperator({
          userId: crypto.randomUUID(),
          sport: "padel",
          levelTenths: 40,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.ratings.listForOperator({ sport: "padel" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});

describe("setLevelAsOperator", () => {
  it("sets a Level with no Group and records the Operator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const player = await insertUser(db, "Player");

      const result = await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "padel",
        levelTenths: 45,
        reason: "new_to_group",
      });

      expect(result.level).toEqual({
        level: "4.5",
        levelBand: expect.any(String),
        provisional: false,
      });
      const rating = await ratingFor(db, player.id, GroupSportEnum.PADEL);
      expect(rating?.mu).toBeCloseTo(muFromLevel(4.5));

      const [override] = await db
        .select()
        .from(levelOverrides)
        .where(eq(levelOverrides.userId, player.id));
      expect(override).toMatchObject({
        setByUserId: operator.id,
        groupId: null,
        sport: GroupSportEnum.PADEL,
        reason: "new_to_group",
        hadRating: false,
      });
    } finally {
      await close();
    }
  });

  it("sets a football Level without touching padel", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const player = await insertUser(db, "Player");

      await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "football",
        levelTenths: 30,
      });

      const football = await ratingFor(db, player.id, GroupSportEnum.FOOTBALL);
      expect(football?.mu).toBeCloseTo(muFromLevel(3));
      expect(
        await ratingFor(db, player.id, GroupSportEnum.PADEL),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("refuses the Operator's own Level and an unknown player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");

      await expect(
        setLevelAsOperator(db, {
          operatorUserId: operator.id,
          targetUserId: operator.id,
          sport: "padel",
          levelTenths: 40,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        setLevelAsOperator(db, {
          operatorUserId: operator.id,
          targetUserId: crypto.randomUUID(),
          sport: "padel",
          levelTenths: 40,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

describe("listForOperator", () => {
  it("lists every player with their Level in the chosen sport", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const rated = await insertUser(db, "Amira");
      const unrated = await insertUser(db, "Badr");
      const unclaimed = await insertUser(db, "Carim", {
        email: null,
        phoneNumber: "+97333000111",
        addedAt: new Date(),
      });
      await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: rated.id,
        sport: "padel",
        levelTenths: 52,
      });

      const padel = await listForOperator(db, {
        sport: "padel",
        operatorUserId: operator.id,
      });
      expect(padel.items.map((item) => item.name)).toEqual([
        "Amira",
        "Badr",
        "Carim",
        "Operator",
      ]);
      const [amira, badr, carim, self] = padel.items;
      expect(amira).toMatchObject({
        userId: rated.id,
        level: "5.2",
        levelProvisional: false,
        levelOverride: { setByIsViewer: true, reason: null },
      });
      expect(badr).toMatchObject({
        userId: unrated.id,
        level: null,
        levelBand: null,
        levelOverride: null,
      });
      expect(carim).toMatchObject({ userId: unclaimed.id, unclaimed: true });
      expect(self?.isViewer).toBe(true);

      const football = await listForOperator(db, {
        sport: "football",
        operatorUserId: operator.id,
      });
      expect(football.items[0]).toMatchObject({
        userId: rated.id,
        level: null,
        levelOverride: null,
      });
    } finally {
      await close();
    }
  });

  it("searches by name and pages with a cursor", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      for (const name of ["Sami", "Samira", "Yousef"]) {
        await insertUser(db, name);
      }

      const first = await listForOperator(db, {
        sport: "padel",
        operatorUserId: operator.id,
        query: "sam",
        limit: 1,
      });
      expect(first.items.map((item) => item.name)).toEqual(["Sami"]);
      expect(first.nextCursor).toBe(1);

      const second = await listForOperator(db, {
        sport: "padel",
        operatorUserId: operator.id,
        query: "sam",
        cursor: first.nextCursor,
        limit: 1,
      });
      expect(second.items.map((item) => item.name)).toEqual(["Samira"]);
      expect(second.nextCursor).toBeUndefined();
    } finally {
      await close();
    }
  });
});
