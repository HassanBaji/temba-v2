import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gameCourts,
  games,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { createTournament } from "#src/routers/games/createTournament";
import { updateGameMatchMinutes } from "#src/routers/games/updateMatchMinutes";
import { updateGameName } from "#src/routers/games/updateName";
import { updateGamePlace } from "#src/routers/games/updatePlace";
import { updateGameWindow } from "#src/routers/games/updateWindow";

const errors = messagesFor("en").game.errors;

async function insertVenue(database: TestDatabase) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert Venue");
  }
  return venue.id;
}

async function insertCourt(database: TestDatabase, venueId: string) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name: `Court ${crypto.randomUUID().slice(0, 4)}` })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert Court");
  }
  return row.id;
}

async function setUp(
  database: TestDatabase,
  shape: "groups_only" | "king_of_the_court" = "groups_only",
) {
  const [owner] = await database
    .insert(user)
    .values({ name: "Owner", email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!owner) {
    throw new Error("Failed to insert owner");
  }
  const venueId = await insertVenue(database);
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert Group");
  }
  const courtId = await insertCourt(database, venueId);
  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 4 * 60 * 60 * 1000);
  const king = shape === "king_of_the_court";
  const { id: gameId } = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Cup",
    groupId: group.id,
    isPublic: false,
    tournamentShape: shape,
    teamCount: king ? 4 : 8,
    ...(king ? {} : { poolCount: 2 }),
    venueId,
    courtIds: [courtId],
    matchMinutes: 45,
    windowStart,
    windowEnd,
  });
  return {
    ownerId: owner.id,
    venueId,
    courtId,
    gameId,
    windowStart,
    windowEnd,
  };
}

async function gameRow(database: TestDatabase, gameId: string) {
  const row = await database.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { name: true, venueId: true, matchMinutes: true },
  });
  if (!row) {
    throw new Error("Game not found");
  }
  return row;
}

describe("Social name", () => {
  it("renames a Social and refuses to clear its name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      await updateGameName(db, {
        gameId: seeded.gameId,
        userId: seeded.ownerId,
        customName: "  Winter Cup ",
      });
      expect((await gameRow(db, seeded.gameId)).name).toBe("Winter Cup");
      await expect(
        updateGameName(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          customName: " ",
        }),
      ).rejects.toThrow(messagesFor("en").createGame.validation.nameTournament);
      expect((await gameRow(db, seeded.gameId)).name).toBe("Winter Cup");
    } finally {
      await close();
    }
  });

  it("keeps a Social's name when its window moves", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      await updateGameWindow(db, {
        gameId: seeded.gameId,
        userId: seeded.ownerId,
        windowStart: seeded.windowStart,
        windowEnd: new Date(seeded.windowEnd.getTime() + 30 * 60 * 1000),
        name: "Thu 8:00 PM - 12:30 AM",
      });
      expect((await gameRow(db, seeded.gameId)).name).toBe("Autumn Cup");
    } finally {
      await close();
    }
  });
});

describe("Social Venue", () => {
  it("moves the Venue and its Courts together", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      const nextVenue = await insertVenue(db);
      const first = await insertCourt(db, nextVenue);
      const second = await insertCourt(db, nextVenue);
      await updateGamePlace(db, {
        gameId: seeded.gameId,
        userId: seeded.ownerId,
        venueId: nextVenue,
        courtId: null,
        courtIds: [first, second],
      });
      expect((await gameRow(db, seeded.gameId)).venueId).toBe(nextVenue);
      const recorded = await db.query.gameCourts.findMany({
        where: eq(gameCourts.gameId, seeded.gameId),
        columns: { courtId: true },
      });
      expect(recorded.map((row) => row.courtId).sort()).toEqual(
        [first, second].sort(),
      );
    } finally {
      await close();
    }
  });

  it("refuses a new Venue without Courts there, or with Courts elsewhere", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      const nextVenue = await insertVenue(db);
      await expect(
        updateGamePlace(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          venueId: nextVenue,
          courtId: null,
          courtIds: [],
        }),
      ).rejects.toThrow(errors.courtsAtLeastOne);
      await expect(
        updateGamePlace(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          venueId: nextVenue,
          courtId: null,
          courtIds: [seeded.courtId],
        }),
      ).rejects.toThrow();
      expect((await gameRow(db, seeded.gameId)).venueId).toBe(seeded.venueId);
    } finally {
      await close();
    }
  });

  it("locks the Venue once the draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      await db
        .update(games)
        .set({ drawPostedAt: new Date() })
        .where(eq(games.id, seeded.gameId));
      const nextVenue = await insertVenue(db);
      const court = await insertCourt(db, nextVenue);
      await expect(
        updateGamePlace(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          venueId: nextVenue,
          courtId: null,
          courtIds: [court],
        }),
      ).rejects.toThrow(errors.venueAfterDraw);
    } finally {
      await close();
    }
  });
});

describe("Social match length", () => {
  it("changes the match length until the draw is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      await updateGameMatchMinutes(db, {
        gameId: seeded.gameId,
        userId: seeded.ownerId,
        matchMinutes: 30,
      });
      expect((await gameRow(db, seeded.gameId)).matchMinutes).toBe(30);
      await expect(
        updateGameMatchMinutes(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          matchMinutes: 33,
        }),
      ).rejects.toThrow(messagesFor("en").createGame.matchMinutes);
      await db
        .update(games)
        .set({ drawPostedAt: new Date() })
        .where(eq(games.id, seeded.gameId));
      await expect(
        updateGameMatchMinutes(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          matchMinutes: 40,
        }),
      ).rejects.toThrow(errors.matchMinutesAfterDraw);
    } finally {
      await close();
    }
  });

  it("refuses a match length on King of the court", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db, "king_of_the_court");
      await expect(
        updateGameMatchMinutes(db, {
          gameId: seeded.gameId,
          userId: seeded.ownerId,
          matchMinutes: 30,
        }),
      ).rejects.toThrow(errors.matchMinutesKing);
    } finally {
      await close();
    }
  });

  it("refuses someone who is not an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await setUp(db);
      const [stranger] = await db
        .insert(user)
        .values({
          name: "Stranger",
          email: `${crypto.randomUUID()}@example.com`,
        })
        .returning({ id: user.id });
      await expect(
        updateGameMatchMinutes(db, {
          gameId: seeded.gameId,
          userId: stranger!.id,
          matchMinutes: 30,
        }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
