import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  levelDisputes,
  levelOverrides,
  notifications,
  ratings,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { levelFromMu, muFromLevel } from "@repo/domain/level";

import { listNotifications } from "#src/routers/notifications/list";
import { decideLevelDispute } from "#src/routers/ratings/decideLevelDispute";
import { disputeLevel } from "#src/routers/ratings/disputeLevel";
import { ratingHistory } from "#src/routers/ratings/history";
import { listLevelDisputesForOperator } from "#src/routers/ratings/listLevelDisputesForOperator";
import { setLevelAsOperator } from "#src/routers/ratings/setLevelAsOperator";

async function insertUser(
  database: TestDatabase,
  name: string,
  isOperator = false,
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name}-${crypto.randomUUID()}@example.com`,
      isOperator,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function setUp(database: TestDatabase) {
  const operator = await insertUser(database, "Operator Omar", true);
  const otherOperator = await insertUser(database, "Operator Noor", true);
  const player = await insertUser(database, "Player Sara");
  const { overrideId } = await setLevelAsOperator(database, {
    operatorUserId: operator.id,
    targetUserId: player.id,
    sport: "padel",
    levelTenths: 45,
    reason: "plays_above_results",
    note: "Watched her final",
  });
  return { operator, otherOperator, player, overrideId };
}

async function padelMu(database: TestDatabase, userId: string) {
  const row = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, userId),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });
  return row?.mu ?? null;
}

describe("decideLevelDispute", () => {
  it("upholding takes the adjustment's move back and tells the player without a name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      const override = await db.query.levelOverrides.findFirst({
        where: eq(levelOverrides.id, overrideId),
      });
      if (!override) {
        throw new Error("Missing the override");
      }
      const later = muFromLevel(4.7);
      await db
        .update(ratings)
        .set({ mu: later })
        .where(eq(ratings.userId, player.id));

      const { disputeId } = await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "Too high",
      });
      const result = await decideLevelDispute(db, {
        disputeId,
        upheld: true,
        operatorUserId: operator.id,
      });
      expect(result.status).toBe("upheld");

      const expected = levelFromMu(
        later - (override.muAfter - override.muBefore),
      );
      const mu = await padelMu(db, player.id);
      expect(levelFromMu(mu ?? 0)).toBeCloseTo(expected, 6);

      const restored = await db.query.levelOverrides.findFirst({
        where: eq(levelOverrides.id, result.restoredOverrideId ?? ""),
      });
      expect(restored).toMatchObject({
        setByRole: "operator",
        reason: "correcting_a_mistake",
      });

      const { items } = await listNotifications(db, { userId: player.id });
      const decided = items.find((row) => row.type === "level_dispute_decided");
      expect(decided).toMatchObject({
        audience: "player",
        actor: null,
        levelDispute: { status: "upheld" },
      });

      const history = await ratingHistory(db, {
        userId: player.id,
        sport: "padel",
        ladder: "level",
      });
      const overrides = history.entries.filter(
        (entry) => entry.kind === "level_override",
      );
      expect(overrides).toMatchObject([
        { id: result.restoredOverrideId, restoresLevel: true, dispute: null },
        { id: overrideId, restoresLevel: false, dispute: "upheld" },
      ]);
    } finally {
      await close();
    }
  });

  it("dismissing keeps the Level and tells the player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      const before = await padelMu(db, player.id);
      const { disputeId } = await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "Too high",
      });
      await decideLevelDispute(db, {
        disputeId,
        upheld: false,
        operatorUserId: operator.id,
      });
      expect(await padelMu(db, player.id)).toBe(before);
      const rows = await db.query.notifications.findMany({
        where: and(
          eq(notifications.recipientUserId, player.id),
          eq(notifications.type, "level_dispute_decided"),
        ),
      });
      expect(rows).toHaveLength(1);
      await expect(
        decideLevelDispute(db, {
          disputeId,
          upheld: true,
          operatorUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await listLevelDisputesForOperator(db)).items).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses to uphold once the Level was set by hand again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      const { disputeId } = await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "Too high",
      });
      await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "padel",
        levelTenths: 40,
        reason: "correcting_a_mistake",
      });
      await expect(
        decideLevelDispute(db, {
          disputeId,
          upheld: true,
          operatorUserId: operator.id,
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    } finally {
      await close();
    }
  });
});
