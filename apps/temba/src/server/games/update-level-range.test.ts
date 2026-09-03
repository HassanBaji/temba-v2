import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, user, venues } from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { updateGameLevelRange } from "~/server/games/update-level-range";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

describe("updateGameLevelRange", () => {
  it("lets an Organizer set, change, and clear the range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "level-range-owner@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const created = await createFriendlyGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        windowStart,
        windowEnd,
      });

      await updateGameLevelRange(db, {
        gameId: created.game.id,
        userId: owner.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      let row = await db.query.games.findFirst({
        where: eq(games.id, created.game.id),
      });
      expect(row?.levelMinTenths).toBe(30);
      expect(row?.levelMaxTenths).toBe(45);

      const detail = await gameById(db, {
        gameId: created.game.id,
        userId: owner.id,
      });
      expect(detail.levelMinTenths).toBe(30);
      expect(detail.levelMaxTenths).toBe(45);

      await updateGameLevelRange(db, {
        gameId: created.game.id,
        userId: owner.id,
        levelMinTenths: 0,
        levelMaxTenths: null,
      });
      row = await db.query.games.findFirst({
        where: eq(games.id, created.game.id),
      });
      expect(row?.levelMinTenths).toBe(0);
      expect(row?.levelMaxTenths).toBeNull();

      await updateGameLevelRange(db, {
        gameId: created.game.id,
        userId: owner.id,
        levelMinTenths: null,
        levelMaxTenths: null,
      });
      row = await db.query.games.findFirst({
        where: eq(games.id, created.game.id),
      });
      expect(row?.levelMinTenths).toBeNull();
      expect(row?.levelMaxTenths).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses cancelled Games and non-organizers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(
        db,
        "level-range-cancel-owner@example.com",
      );
      const other = await insertUser(db, "level-range-other@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const created = await createFriendlyGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        windowStart,
        windowEnd,
      });

      await expect(
        updateGameLevelRange(db, {
          gameId: created.game.id,
          userId: other.id,
          levelMinTenths: 30,
          levelMaxTenths: 45,
        }),
      ).rejects.toBeInstanceOf(TRPCError);

      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, created.game.id));

      await expect(
        updateGameLevelRange(db, {
          gameId: created.game.id,
          userId: owner.id,
          levelMinTenths: 30,
          levelMaxTenths: 45,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });
});
