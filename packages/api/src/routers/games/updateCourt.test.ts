import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  bookings,
  courts,
  gameCourts,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createGame } from "#src/routers/games/create";
import { listAssignableCourts } from "#src/routers/games/listCourts";
import { updateGameCourt } from "#src/routers/games/updateCourt";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  sport: "padel" | "football",
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name: `${sport} ${crypto.randomUUID()}`, sport })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row.id;
}

async function withVenue(
  sport: "padel" | "football",
  run: (f: {
    db: TestDatabase;
    organizer: { id: string };
    venueId: string;
    first: string;
    second: string;
    otherSport: string;
    groupId: string;
  }) => Promise<void>,
) {
  const { db, close } = await createPgliteDb();
  try {
    const organizer = await insertUser(db, "organizer");
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Venue ${crypto.randomUUID()}`,
        city: "Manama",
        country: "BH",
      })
      .returning({ id: venues.id });
    const [group] = await db
      .insert(groups)
      .values({ name: "Group", createdBy: organizer.id, sport })
      .returning({ id: groups.id });
    if (!venue || !group) {
      throw new Error("Failed to insert Venue or Group");
    }
    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId: organizer.id, role: "organizer" });
    await run({
      db,
      organizer,
      venueId: venue.id,
      first: await insertCourt(db, venue.id, sport),
      second: await insertCourt(db, venue.id, sport),
      otherSport: await insertCourt(
        db,
        venue.id,
        sport === "padel" ? "football" : "padel",
      ),
      groupId: group.id,
    });
  } finally {
    await close();
  }
}

type Fixture = Parameters<Parameters<typeof withVenue>[1]>[0];

async function createFriendly(f: Fixture) {
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const created = await createGame(f.db, {
    createdBy: f.organizer.id,
    groupId: f.groupId,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: f.venueId,
    courtId: f.first,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  });
  const game = await f.db.query.games.findFirst({
    where: eq(games.id, created.id),
  });
  if (!game) {
    throw new Error("Game missing");
  }
  return game;
}

async function matchCourtIds(database: TestDatabase, gameId: string) {
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
    columns: { courtId: true },
  });
  return rows.map((row) => row.courtId);
}

async function recordedCourtIds(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, gameId),
    columns: { courtId: true },
  });
  return rows.map((row) => row.courtId);
}

describe("games.updateCourt", () => {
  it("moves a padel Friendly game's Match to another Court and back to none", async () => {
    await withVenue("padel", async (f) => {
      const game = await createFriendly(f);
      expect(await matchCourtIds(f.db, game.id)).toEqual([f.first]);

      await updateGameCourt(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        courtId: f.second,
      });
      expect(await matchCourtIds(f.db, game.id)).toEqual([f.second]);

      await updateGameCourt(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        courtId: null,
      });
      expect(await matchCourtIds(f.db, game.id)).toEqual([null]);
    });
  });

  it("moves a football Friendly game to another Pitch of the Venue", async () => {
    await withVenue("football", async (f) => {
      const game = await createFriendly(f);
      expect(await recordedCourtIds(f.db, game.id)).toEqual([f.first]);
      const choices = await listAssignableCourts(f.db, game);
      expect(choices.map((court) => court.id).sort()).toEqual(
        [f.first, f.second].sort(),
      );

      await updateGameCourt(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        courtId: f.second,
      });
      expect(await recordedCourtIds(f.db, game.id)).toEqual([f.second]);

      await updateGameCourt(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        courtId: null,
      });
      expect(await recordedCourtIds(f.db, game.id)).toEqual([]);
    });
  });

  it("refuses a Court of another sport", async () => {
    await withVenue("padel", async (f) => {
      const game = await createFriendly(f);
      await expect(
        updateGameCourt(f.db, {
          gameId: game.id,
          userId: f.organizer.id,
          courtId: f.otherSport,
        }),
      ).rejects.toThrow("Court must be of this Game's sport");
      expect(await matchCourtIds(f.db, game.id)).toEqual([f.first]);
    });
  });

  it("refuses anyone but the Organizer", async () => {
    await withVenue("padel", async (f) => {
      const game = await createFriendly(f);
      const stranger = await insertUser(f.db, "stranger");
      await expect(
        updateGameCourt(f.db, {
          gameId: game.id,
          userId: stranger.id,
          courtId: f.second,
        }),
      ).rejects.toThrow();
      expect(await matchCourtIds(f.db, game.id)).toEqual([f.first]);
    });
  });

  it("keeps the Court of a Game made from a Booking", async () => {
    await withVenue("padel", async (f) => {
      const game = await createFriendly(f);
      await f.db.insert(bookings).values({
        venueId: f.venueId,
        courtId: f.first,
        userId: f.organizer.id,
        startsAt: game.windowStart!,
        endsAt: game.windowEnd!,
        source: "app",
        priceFils: 10_000,
        cancellationPolicy: {
          tiers: [],
          lateRefundPercent: 0,
          customerCancelUntilMinutes: 0,
        },
        gameId: game.id,
      });
      await expect(
        updateGameCourt(f.db, {
          gameId: game.id,
          userId: f.organizer.id,
          courtId: f.second,
        }),
      ).rejects.toThrow("This Game's Court comes from its Booking");
      expect(await matchCourtIds(f.db, game.id)).toEqual([f.first]);
    });
  });
});
