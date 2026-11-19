import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { levelDisputes, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { listNotifications } from "#src/routers/notifications/list";
import { disputeLevel } from "#src/routers/ratings/disputeLevel";
import { ratingHistory } from "#src/routers/ratings/history";
import { listLevelDisputesForOperator } from "#src/routers/ratings/listLevelDisputesForOperator";
import { setLevelAsOperator } from "#src/routers/ratings/setLevelAsOperator";

const DAY = 24 * 60 * 60 * 1000;

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

describe("level_set Notification", () => {
  it("never tells the player who set their Level or why", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { player } = await setUp(db);
      const { items } = await listNotifications(db, { userId: player.id });
      const item = items.find((row) => row.type === "level_set");
      expect(item?.actor).toBeNull();
      expect(item?.levelSet).toEqual({
        level: "4.5",
        levelBand: expect.any(String),
        sport: "padel",
      });
    } finally {
      await close();
    }
  });
});

describe("disputeLevel", () => {
  it("records the dispute and tells every Operator, naming the player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, otherOperator, player, overrideId } = await setUp(db);
      const { disputeId } = await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "  I lost every match at this Level  ",
      });

      const dispute = await db.query.levelDisputes.findFirst({
        where: eq(levelDisputes.id, disputeId),
      });
      expect(dispute).toMatchObject({
        status: "open",
        note: "I lost every match at this Level",
        raisedByUserId: player.id,
      });

      for (const recipient of [operator, otherOperator]) {
        const { items } = await listNotifications(db, {
          userId: recipient.id,
        });
        const raised = items.find((row) => row.type === "level_dispute_raised");
        expect(raised).toMatchObject({
          audience: "admin",
          actor: { id: player.id },
          levelDispute: {
            status: "open",
            note: "I lost every match at this Level",
          },
        });
      }
    } finally {
      await close();
    }
  });

  it("shows the Operator who set the Level and why, which the player never sees", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "Too high",
      });
      const { items } = await listLevelDisputesForOperator(db);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        note: "Too high",
        raisedBy: { id: player.id },
        override: {
          id: overrideId,
          setByRole: "operator",
          setBy: { id: operator.id, name: "Operator Omar" },
          reason: "plays_above_results",
          note: "Watched her final",
        },
      });

      const history = await ratingHistory(db, {
        userId: player.id,
        sport: "padel",
        ladder: "level",
      });
      const line = history.entries.find(
        (entry) => entry.kind === "level_override",
      );
      expect(line).toMatchObject({ dispute: "open", restoresLevel: false });
      expect(JSON.stringify(line)).not.toContain("Operator Omar");
      expect(JSON.stringify(line)).not.toContain("Watched her final");
    } finally {
      await close();
    }
  });

  it("refuses someone else's adjustment, a second dispute, and a late one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      await expect(
        disputeLevel(db, {
          levelOverrideId: overrideId,
          userId: operator.id,
          note: "Not mine",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        disputeLevel(db, {
          levelOverrideId: overrideId,
          userId: player.id,
          note: "Too high",
          now: new Date(Date.now() + 15 * DAY),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await disputeLevel(db, {
        levelOverrideId: overrideId,
        userId: player.id,
        note: "Too high",
      });
      await expect(
        disputeLevel(db, {
          levelOverrideId: overrideId,
          userId: player.id,
          note: "Again",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    } finally {
      await close();
    }
  });

  it("refuses an adjustment a newer one replaced, and one the player made", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { operator, player, overrideId } = await setUp(db);
      await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: player.id,
        sport: "padel",
        levelTenths: 40,
        reason: "correcting_a_mistake",
      });
      await expect(
        disputeLevel(db, {
          levelOverrideId: overrideId,
          userId: player.id,
          note: "Too high",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const own = await setLevelAsOperator(db, {
        operatorUserId: operator.id,
        targetUserId: operator.id,
        sport: "padel",
        levelTenths: 40,
        reason: "new_to_group",
      });
      await expect(
        disputeLevel(db, {
          levelOverrideId: own.overrideId,
          userId: operator.id,
          note: "Mine",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });
});
