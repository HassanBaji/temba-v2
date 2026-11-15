import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groups, user, venues } from "@repo/db/schema";

import { createGame, createGameInputSchema } from "#src/routers/games/create";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

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
  args: { createdBy: string; name?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name ?? `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
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

  it("refuses a start more than 15 minutes in the past and allows one just before now", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-past@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const now = new Date("2026-11-09T18:00:00.000Z");
      const at = (minutesBefore: number) => {
        const windowStart = new Date(now.getTime() - minutesBefore * 60_000);
        return {
          createdBy: owner.id,
          groupId: group.id,
          isPublic: false,
          format: "friendly_game" as const,
          registrationMode: "individual" as const,
          venueId: venue.id,
          windowStart,
          windowEnd: new Date(windowStart.getTime() + 90 * 60_000),
        };
      };

      await expect(createGame(db, at(60), { now })).rejects.toThrow(
        messagesFor("en").game.errors.startInPast,
      );
      await expect(createGame(db, at(10), { now })).resolves.toMatchObject({
        id: expect.any(String),
      });
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

describe("createGame MVP mode", () => {
  it("defaults a Friendly game to a vote, keeps the Organizer's choice, and leaves other formats without one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-mvp@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const base = {
        createdBy: owner.id,
        groupId: group.id,
        isPublic: false,
        registrationMode: "individual" as const,
        venueId: venue.id,
        ...window(),
      };
      const mvpModeOf = async (id: string) =>
        (
          await db.query.games.findFirst({
            where: eq(games.id, id),
            columns: { mvpMode: true },
          })
        )?.mvpMode;

      const byDefault = await createGame(db, {
        ...base,
        format: "friendly_game",
      });
      expect(byDefault).toEqual({
        id: expect.any(String),
        matchId: expect.any(String),
      });
      expect(await mvpModeOf(byDefault.id)).toBe("vote");
      for (const mvpMode of ["organizer", "none"] as const) {
        const chosen = await createGame(db, {
          ...base,
          format: "friendly_game",
          mvpMode,
        });
        expect(await mvpModeOf(chosen.id)).toBe(mvpMode);
      }
      for (const format of ["americano", "friendly_tournament"] as const) {
        const other = await createGame(db, {
          ...base,
          format,
          playersAllowed: 8,
        });
        expect(await mvpModeOf(other.id)).toBe("none");
      }
    } finally {
      await close();
    }
  });

  it("refuses an MVP mode on a tournament or an Americano", () => {
    for (const format of ["americano", "friendly_tournament"] as const) {
      const parsed = createGameInputSchema.safeParse({
        groupId: crypto.randomUUID(),
        isPublic: false,
        format,
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60 * 60 * 1000),
        venueId: crypto.randomUUID(),
        mvpMode: "vote",
      });
      expect(parsed.success).toBe(false);
      if (parsed.success) {
        return;
      }
      expect(parsed.error.flatten().fieldErrors.mvpMode).toBeDefined();
    }
    expect(
      createGameInputSchema.safeParse({
        groupId: crypto.randomUUID(),
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60 * 60 * 1000),
        venueId: crypto.randomUUID(),
        mvpMode: "organizer",
      }).success,
    ).toBe(true);
  });
});
