import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, user, venues } from "@repo/db/schema";

import {
  createGame,
  createGameInputSchema,
} from "~/server/api/routers/games/create";
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

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; name?: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name ?? `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
      communityId: args.communityId,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

function window() {
  const windowStart = new Date();
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  };
}

describe("createGame Group", () => {
  it("refuses a crafted payload without groupId", () => {
    const parsed = createGameInputSchema.safeParse({
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 60 * 60 * 1000),
      venueId: crypto.randomUUID(),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    expect(parsed.error.flatten().fieldErrors.groupId).toBeDefined();
  });

  it("creates a Game on a Group the caller may organize", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-group-ok@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const created = await createGame(db, {
        createdBy: owner.id,
        groupId: group.id,
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        venueId: venue.id,
        ...window(),
      });
      expect(created.id).toBeDefined();
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.groupId).toBe(group.id);
      expect(row?.allowSoloRegister).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses a Group the caller may not organize", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-group-owner@example.com");
      const other = await insertUser(db, "create-group-other@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      await expect(
        createGame(db, {
          createdBy: other.id,
          groupId: group.id,
          isPublic: false,
          format: "friendly_game",
          registrationMode: "individual",
          venueId: venue.id,
          ...window(),
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });
});

describe("createGame Level range", () => {
  it("stores omitted tenths as null on Americano and Friendly tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-format-omit@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const { windowStart, windowEnd } = window();

      const americano = await createGame(db, {
        createdBy: owner.id,
        groupId: group.id,
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
      expect(americanoRow?.groupId).toBe(group.id);

      const tournament = await createGame(db, {
        createdBy: owner.id,
        groupId: group.id,
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
      expect(tournamentRow?.groupId).toBe(group.id);
    } finally {
      await close();
    }
  });

  it("persists tenths on Americano and Friendly tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-format-level@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const { windowStart, windowEnd } = window();

      const americano = await createGame(db, {
        createdBy: owner.id,
        groupId: group.id,
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
        groupId: group.id,
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
