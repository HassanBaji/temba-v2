import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  levelOverrides,
  notifications,
  ratings,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { listForOperator } from "#src/routers/ratings/listForOperator";
import { listNotifications } from "#src/routers/notifications/list";
import { loadRatingsMe } from "#src/routers/ratings/me";
import { setLevelAsOperator } from "#src/routers/ratings/setLevelAsOperator";
import { formatOvr, ovrFromMu } from "@repo/domain/football-ovr";
import { muFromLevel } from "@repo/domain/level";
import { notificationCopy } from "@repo/domain/notification-copy";

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
      locale: "en",
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
        ovr: null,
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
        setByRole: "operator",
        groupId: null,
        sport: GroupSportEnum.PADEL,
        reason: "new_to_group",
        note: null,
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
        reason: "new_to_group",
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

  it("sets OVR 71, which reads back as 71", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const player = await insertUser(db, "Player");

      const result = await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "football",
        ovr: 71,
        reason: "plays_above_results",
        note: "Assessed over two sessions, plays above 68.",
      });

      expect(result.level).toMatchObject({
        ovr: "71",
        levelBand: "C1",
        provisional: false,
      });
      const football = await ratingFor(db, player.id, GroupSportEnum.FOOTBALL);
      expect(football && ovrFromMu(football.mu)).toBeCloseTo(71, 9);
      expect(football?.phi).toBeLessThanOrEqual(150);
      const [override] = await db
        .select()
        .from(levelOverrides)
        .where(eq(levelOverrides.userId, player.id));
      const me = await loadRatingsMe(db, {
        userId: player.id,
        sport: "football",
      });
      expect(me.ovr).toBe(71);
      const listed = await listForOperator(db, {
        operatorUserId: operator.id,
        sport: "football",
      });
      const row = listed.items.find((item) => item.userId === player.id);
      expect(row?.ovr).toBe(71);
      expect(formatOvr(ovrFromMu(override?.muAfter ?? 0))).toBe("71");

      expect(override).toMatchObject({
        setByRole: "operator",
        reason: "plays_above_results",
        note: "Assessed over two sessions, plays above 68.",
      });
    } finally {
      await close();
    }
  });

  it("tells the player who set it and why", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Yaser Ali");
      const player = await insertUser(db, "Player");

      const result = await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "football",
        ovr: 71,
        reason: "plays_above_results",
        note: "Plays above 68.",
      });

      const rows = await db.query.notifications.findMany({
        where: eq(notifications.recipientUserId, player.id),
      });
      expect(rows).toEqual([
        expect.objectContaining({
          type: "level_set",
          audience: "player",
          actorUserId: operator.id,
          groupId: null,
          levelOverrideId: result.overrideId,
        }),
      ]);
      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.recipientUserId, operator.id),
        }),
      ).toHaveLength(0);

      const { items } = await listNotifications(db, { userId: player.id });
      const item = items[0];
      if (!item) {
        throw new Error("Missing the level_set Notification");
      }
      expect(item.levelSet).toEqual({
        level: "71",
        levelBand: "C1",
        reason: "plays_above_results",
        note: "Plays above 68.",
      });
      const copy = notificationCopy(item, "en");
      expect(copy?.title.map((part) => part.text).join("")).toBe(
        "Yaser Ali set your Level to C+ 71",
      );
      expect(copy?.subline).toBe("Plays above results: “Plays above 68.”");
    } finally {
      await close();
    }
  });

  it("refuses a save with no reason and writes nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const player = await insertUser(db, "Player");

      for (const level of [{ levelTenths: 40 }, { ovr: 71 }]) {
        await expect(
          setLevelAsOperator(db, {
            operatorUserId: operator.id,
            targetUserId: player.id,
            sport: "football",
            ...level,
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "Pick a reason. The player will see it.",
        });
      }
      expect(
        await ratingFor(db, player.id, GroupSportEnum.FOOTBALL),
      ).toBeUndefined();
      expect(await db.select().from(levelOverrides)).toHaveLength(0);
      expect(await db.select().from(notifications)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("takes one of a Level or a football OVR", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const operator = await insertUser(db, "Operator");
      const player = await insertUser(db, "Player");
      const base = {
        operatorUserId: operator.id,
        targetUserId: player.id,
        reason: "new_to_group" as const,
      };

      await expect(
        setLevelAsOperator(db, { ...base, sport: "padel", ovr: 71 }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "OVR is the football Level. Set a padel Level from 0.0 to 7.0",
      });
      await expect(
        setLevelAsOperator(db, {
          ...base,
          sport: "football",
          ovr: 71,
          levelTenths: 40,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Set a Level or an OVR, one of the two",
      });
      await expect(
        setLevelAsOperator(db, { ...base, sport: "football" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      for (const ovr of [39, 100, 71.5]) {
        await expect(
          setLevelAsOperator(db, { ...base, sport: "football", ovr }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "OVR must be a whole number from 40 to 99",
        });
      }
      expect(await db.select().from(levelOverrides)).toHaveLength(0);
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
        reason: "correcting_a_mistake",
        note: "Entered as 2.5 by mistake.",
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
        ovr: null,
        levelProvisional: false,
        levelOverride: {
          setByIsViewer: true,
          reason: "correcting_a_mistake",
          note: "Entered as 2.5 by mistake.",
        },
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
        ovr: null,
        levelOverride: null,
      });

      await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: unrated.id,
        sport: "football",
        levelTenths: 40,
        reason: "new_to_group",
      });
      const footballAfter = await listForOperator(db, {
        sport: "football",
        operatorUserId: operator.id,
      });
      expect(footballAfter.items[1]).toMatchObject({
        userId: unrated.id,
        levelBand: "C1",
        ovr: 74,
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
