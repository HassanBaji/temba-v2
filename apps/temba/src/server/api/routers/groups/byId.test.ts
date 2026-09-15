import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  GroupSportEnum,
  MatchStatusEnum,
  courts,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  ratings,
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

async function insertGroup(
  database: TestDatabase,
  createdBy: string,
  options?: {
    sport?: GroupSportEnum | null;
    members?: string[];
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Friday Night",
      createdBy,
      sport:
        options?.sport === undefined ? GroupSportEnum.PADEL : options.sport,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of [createdBy, ...(options?.members ?? [])]) {
    await database.insert(groupMembers).values({
      groupId: row.id,
      userId,
    });
  }
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

const NOW = new Date("2026-09-15T12:00:00.000Z");

function pastWindow(hoursAgo: number) {
  return {
    windowStart: new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000),
    windowEnd: new Date(NOW.getTime() - (hoursAgo - 2) * 60 * 60 * 1000),
  };
}

/** Seats one player per slot on the Match and scores it. */
async function seatAndScore(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1UserId: string;
    slot2UserId: string;
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
    status?: (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum];
  },
) {
  const [slot1Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!slot1Team || !slot2Team) {
    throw new Error("Failed to insert game teams");
  }

  async function occupy(gameTeamId: string, userId: string) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId,
      gamePlayerId: player.id,
      position: GamePositionEnum.LEFT,
    });
  }

  await occupy(slot1Team.id, args.slot1UserId);
  await occupy(slot2Team.id, args.slot2UserId);

  await database
    .update(matches)
    .set({
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
      status: args.status ?? MatchStatusEnum.COMPLETED,
    })
    .where(eq(matches.id, args.matchId));

  for (const set of args.sets) {
    await database.insert(matchSets).values({
      matchId: args.matchId,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
}

async function insertRating(
  database: TestDatabase,
  args: {
    userId: string;
    sport: GroupSportEnum;
    levelBand: "B1" | "C2";
    phi: number;
  },
) {
  await database.insert(ratings).values({
    userId: args.userId,
    sport: args.sport,
    mu: 1500,
    phi: args.phi,
    sigma: 0.06,
    levelBand: args.levelBand,
  });
}

describe("groupById standing facts", () => {
  it("tallies W-L without counting a draw, and reads Level from the Group's sport", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "standing-viewer@example.com");
      const rival = await insertUser(db, "standing-rival@example.com");
      const newbie = await insertUser(db, "standing-newbie@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, viewer.id, {
        members: [rival.id, newbie.id],
      });

      const won = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(72),
      });
      await seatAndScore(db, {
        gameId: won.game.id,
        matchId: won.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      const lost = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(48),
      });
      await seatAndScore(db, {
        gameId: lost.game.id,
        matchId: lost.matchId,
        slot1UserId: rival.id,
        slot2UserId: viewer.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
      });

      // A drawn Match is played but neither won nor lost.
      const drawn = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(24),
      });
      await seatAndScore(db, {
        gameId: drawn.game.id,
        matchId: drawn.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: 3, slot2GamesWon: 6 },
        ],
      });

      await insertRating(db, {
        userId: viewer.id,
        sport: GroupSportEnum.PADEL,
        levelBand: "B1",
        phi: 100,
      });
      await insertRating(db, {
        userId: rival.id,
        sport: GroupSportEnum.PADEL,
        levelBand: "C2",
        phi: 350,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });
      const byUserId = new Map(
        detail.standing.leaderboard.map((entry) => [entry.userId, entry]),
      );

      expect(byUserId.get(viewer.id)).toMatchObject({
        wins: 1,
        losses: 1,
        levelBand: "B1",
        levelProvisional: false,
      });
      expect(byUserId.get(rival.id)).toMatchObject({
        wins: 1,
        losses: 1,
        // Provisional: a settled band exists but is not shown.
        levelBand: "C2",
        levelProvisional: true,
      });
      expect(byUserId.get(newbie.id)).toMatchObject({
        wins: 0,
        losses: 0,
        levelBand: null,
        levelProvisional: true,
      });
      expect(byUserId.get(viewer.id)?.formMarks).toEqual([
        "won",
        "lost",
        "not-played",
      ]);
    } finally {
      await close();
    }
  });

  it("shows no Level at all when the Group has no sport", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "standing-nosport@example.com");
      const group = await insertGroup(db, viewer.id, { sport: null });
      await insertRating(db, {
        userId: viewer.id,
        sport: GroupSportEnum.PADEL,
        levelBand: "B1",
        phi: 100,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });

      expect(detail.standing.leaderboard).toHaveLength(1);
      expect(detail.standing.leaderboard[0]).toMatchObject({
        levelBand: null,
        levelProvisional: true,
      });
    } finally {
      await close();
    }
  });

  it("counts Games whose Match still awaits a score, and reports zero when none do", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "standing-await@example.com");
      const rival = await insertUser(db, "standing-await-2@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, viewer.id, { members: [rival.id] });

      const scored = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(48),
      });
      await seatAndScore(db, {
        gameId: scored.game.id,
        matchId: scored.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      const settled = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });
      expect(settled.standing.awaitingScoreCount).toBe(0);

      // A full Game whose window has passed with its Match still open.
      const awaiting = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(24),
      });
      await seatAndScore(db, {
        gameId: awaiting.game.id,
        matchId: awaiting.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [],
        status: MatchStatusEnum.CONFIRMED,
      });
      // `playersAllowed` is 4, so the Game only counts once it is at cap.
      for (const filler of ["await-3", "await-4"]) {
        const extra = await insertUser(db, `standing-${filler}@example.com`);
        await db.insert(gamePlayers).values({
          gameId: awaiting.game.id,
          userId: extra.id,
        });
      }

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });
      expect(detail.standing.awaitingScoreCount).toBe(1);
    } finally {
      await close();
    }
  });
});
