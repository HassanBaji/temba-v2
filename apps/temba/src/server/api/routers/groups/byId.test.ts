import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  courts,
  gamePlayers,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { groupById } from "~/server/api/routers/groups/byId";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase, name = "Padel Club") {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Lisbon", country: "PT" })
    .returning({ id: venues.id, name: venues.name });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Friday Night", createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values({
    groupId: row.id,
    userId: createdBy,
  });
  return row;
}

async function insertGroupGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    groupId: string;
    isPublic?: boolean;
    windowStart: Date;
    windowEnd: Date;
    courtName?: string;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Evening session",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      isPublic: args.isPublic ?? false,
      playersAllowed: 4,
      teamsAllowed: 2,
      pricePerPlayerCents: 500,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }

  let courtId: string | null = null;
  if (args.courtName) {
    const [court] = await database
      .insert(courts)
      .values({ venueId: args.venueId, name: args.courtName })
      .returning({ id: courts.id });
    courtId = court?.id ?? null;
  }

  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      courtId,
      startTime: args.windowStart,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }

  return { game, matchId: match.id };
}

describe("groupById Game enrichment", () => {
  it("returns Venue, Court, occupancy, registration status, seated people, and viewer standing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "group-home-viewer@example.com");
      const seated = await insertUser(db, "group-home-seated@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, viewer.id);
      const windowStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() + 50 * 60 * 60 * 1000);
      const { game } = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        isPublic: true,
        courtName: "Court 1",
        windowStart,
        windowEnd,
      });
      await db.insert(gamePlayers).values({
        gameId: game.id,
        userId: seated.id,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
      });
      const row = detail.upcomingGames.find((item) => item.id === game.id);
      expect(row).toMatchObject({
        venueName: "Padel Club",
        courtName: "Court 1",
        registeredUserCount: 1,
        playersAllowed: 4,
        registrationStatus: "open",
        isPublic: true,
        isRegistered: false,
        isWaitlisted: false,
        joinFrozen: false,
        pricePerPlayerCents: 500,
      });
      expect(row?.seatedPeople).toEqual([{ name: seated.name, image: null }]);
    } finally {
      await close();
    }
  });

  it("marks the viewer waitlisted and keeps history Set scores only when scored", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "group-home-wait@example.com");
      const venue = await insertVenue(db, "Ocean Padel");
      const group = await insertGroup(db, viewer.id);
      const windowStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() + 50 * 60 * 60 * 1000);
      const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 46 * 60 * 60 * 1000);
      const upcoming = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        courtName: "Court 2",
        windowStart,
        windowEnd,
      });
      await db.insert(gameWaitlist).values({
        gameId: upcoming.game.id,
        userId: viewer.id,
      });

      const history = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        windowStart: pastStart,
        windowEnd: pastEnd,
      });
      await db
        .update(matches)
        .set({ status: MatchStatusEnum.COMPLETED })
        .where(eq(matches.id, history.matchId));
      await db.insert(matchSets).values({
        matchId: history.matchId,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      await db.insert(matchSets).values({
        matchId: history.matchId,
        slot1GamesWon: null,
        slot2GamesWon: null,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
      });
      const waitlisted = detail.upcomingGames.find(
        (item) => item.id === upcoming.game.id,
      );
      expect(waitlisted?.isWaitlisted).toBe(true);
      expect(waitlisted?.isRegistered).toBe(false);

      const past = detail.gameHistory.find(
        (item) => item.id === history.game.id,
      );
      expect(past?.setScores).toEqual([{ slot1GamesWon: 6, slot2GamesWon: 4 }]);
      expect(past?.registrationStatus).toBe("closed");
    } finally {
      await close();
    }
  });
});
