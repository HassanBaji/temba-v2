import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, user, venues } from "@repo/db/schema";

import { createGame } from "~/server/games/create";
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

describe("createGame Level range", () => {
  it("stores omitted tenths as null on Americano and Friendly tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-format-omit@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const americano = await createGame(db, {
        createdBy: owner.id,
        isPublic: false,
        format: "americano",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart,
        windowEnd,
        venueId: venue.id,
      });
      const americanoRow = await db.query.games.findFirst({
        where: eq(games.id, americano.id),
      });
      expect(americanoRow?.levelMinTenths).toBeNull();
      expect(americanoRow?.levelMaxTenths).toBeNull();

      const tournament = await createGame(db, {
        createdBy: owner.id,
        isPublic: false,
        format: "friendly_tournament",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart,
        windowEnd,
        venueId: venue.id,
      });
      const tournamentRow = await db.query.games.findFirst({
        where: eq(games.id, tournament.id),
      });
      expect(tournamentRow?.levelMinTenths).toBeNull();
      expect(tournamentRow?.levelMaxTenths).toBeNull();
    } finally {
      await close();
    }
  });

  it("persists tenths on Americano and Friendly tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-format-level@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const americano = await createGame(db, {
        createdBy: owner.id,
        isPublic: false,
        format: "americano",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart,
        windowEnd,
        venueId: venue.id,
        levelMinTenths: 0,
        levelMaxTenths: 42,
      });
      const americanoRow = await db.query.games.findFirst({
        where: eq(games.id, americano.id),
      });
      expect(americanoRow?.levelMinTenths).toBe(0);
      expect(americanoRow?.levelMaxTenths).toBe(42);

      const tournament = await createGame(db, {
        createdBy: owner.id,
        isPublic: false,
        format: "friendly_tournament",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart,
        windowEnd,
        venueId: venue.id,
        levelMinTenths: 30,
      });
      const tournamentRow = await db.query.games.findFirst({
        where: eq(games.id, tournament.id),
      });
      expect(tournamentRow?.levelMinTenths).toBe(30);
      expect(tournamentRow?.levelMaxTenths).toBeNull();
    } finally {
      await close();
    }
  });
});
