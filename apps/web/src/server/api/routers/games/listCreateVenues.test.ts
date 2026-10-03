import { describe, expect, it } from "vitest";

import {
  courts,
  gameCourts,
  gamePlayers,
  games,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listRecentCourtIds } from "~/server/api/routers/games/listCreateVenues";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
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
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  name: string,
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    windowStart: Date;
    cancelledAt?: Date;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      venueId: args.venueId,
      createdBy: args.createdBy,
      windowStart: args.windowStart,
      windowEnd: new Date(args.windowStart.getTime() + 60 * 60 * 1000),
      cancelledAt: args.cancelledAt,
    })
    .returning({ id: games.id });
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row;
}

describe("listRecentCourtIds", () => {
  it("returns courts from the caller's bookings, newest first", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "recent-courts-org@example.com");
      const player = await insertUser(db, "recent-courts-player@example.com");
      const stranger = await insertUser(db, "recent-courts-other@example.com");
      const venue = await insertVenue(db);
      const older = await insertCourt(db, venue.id, "1");
      const newer = await insertCourt(db, venue.id, "2");
      const played = await insertCourt(db, venue.id, "3");
      const cancelled = await insertCourt(db, venue.id, "4");
      const recorded = await insertCourt(db, venue.id, "6");
      const strangerCourt = await insertCourt(db, venue.id, "7");

      const olderGame = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-01T10:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: olderGame.id,
        courtId: older.id,
      });

      const newerGame = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-20T10:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: newerGame.id,
        courtId: newer.id,
      });
      await db.insert(gameCourts).values({
        gameId: newerGame.id,
        courtId: recorded.id,
      });

      const openCourt = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-21T10:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: openCourt.id,
        courtId: null,
      });

      const cancelledGame = await insertGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-22T10:00:00.000Z"),
        cancelledAt: new Date("2026-09-22T09:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: cancelledGame.id,
        courtId: cancelled.id,
      });

      const playedGame = await insertGame(db, {
        createdBy: stranger.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-10T10:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: playedGame.id,
        courtId: played.id,
      });
      await db.insert(gamePlayers).values({
        gameId: playedGame.id,
        userId: organizer.id,
      });

      const otherGame = await insertGame(db, {
        createdBy: stranger.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-25T10:00:00.000Z"),
      });
      await db.insert(matches).values({
        gameId: otherGame.id,
        courtId: strangerCourt.id,
      });

      const ids = await listRecentCourtIds(db, organizer.id);
      expect(ids).toEqual([newer.id, recorded.id, played.id, older.id]);

      const playerIds = await listRecentCourtIds(db, player.id);
      expect(playerIds).toEqual([]);
    } finally {
      await close();
    }
  });
});
