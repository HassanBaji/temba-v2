import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  GroupSportEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
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
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { nextMatchSetNumber } from "~/server/games/next-match-set-number";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  options?: { image?: string | null },
) {
  const [row] = await database
    .insert(user)
    .values({
      name: email.split("@")[0] ?? "User",
      email,
      image: options?.image,
    })
    .returning({ id: user.id, name: user.name, image: user.image });
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

describe("groupById Games tab", () => {
  it("returns Scheduled Games in the Games hub row shape, seat roster included", async () => {
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
        // The fields `GameSummaryCard` reads, as `games.listMyGames` returns
        // them — one shape, not a Group-local second one.
        venue: { name: "Padel Club", city: "Lisbon" },
        groupName: "Friday Night",
        registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
        registeredUserCount: 1,
        playersAllowed: 4,
        registrationStatus: "open",
        isPublic: true,
        isRegistered: false,
        isSeated: false,
        isWaitlisted: false,
        canRegister: true,
        joinFrozen: false,
        pricePerPlayerCents: 500,
      });
      expect(row?.sides).toEqual([
        { sideIndex: 1, left: null, right: null },
        { sideIndex: 2, left: null, right: null },
      ]);
    } finally {
      await close();
    }
  });

  it("marks the viewer waitlisted and returns a Played row read from their slot", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "group-home-wait@example.com");
      const rival = await insertUser(db, "group-home-rival@example.com");
      const venue = await insertVenue(db, "Ocean Padel");
      const group = await insertGroup(db, viewer.id, { members: [rival.id] });
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
      // The viewer sits on slot 2 and loses, so the row reads their own side
      // first and the scoreline from slot 2.
      await seatAndScore(db, {
        gameId: history.game.id,
        matchId: history.matchId,
        slot1UserId: rival.id,
        slot2UserId: viewer.id,
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: null, slot2GamesWon: null },
        ],
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
      expect(waitlisted?.canRegister).toBe(false);

      const past = detail.gameHistory.find(
        (item) => item.id === history.game.id,
      );
      expect(past).toMatchObject({
        viewerSlot: 2,
        outcome: "lost",
        cancelled: false,
        venueName: "Ocean Padel",
      });
      // Unscored Sets are dropped; only the scored one survives.
      expect(past?.scoredSets).toEqual([
        { slot1GamesWon: 6, slot2GamesWon: 4 },
      ]);
      expect(past?.slot1Members.map((member) => member.isViewer)).toEqual([
        false,
      ]);
      expect(past?.slot2Members.map((member) => member.isViewer)).toEqual([
        true,
      ]);
    } finally {
      await close();
    }
  });

  it("reads no result off a Match that is scored but not yet completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "group-home-unconfirmed@example.com");
      const rival = await insertUser(
        db,
        "group-home-unconfirmed-2@example.com",
      );
      const venue = await insertVenue(db);
      const group = await insertGroup(db, viewer.id, { members: [rival.id] });
      const game = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(48),
      });
      await seatAndScore(db, {
        gameId: game.game.id,
        matchId: game.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
        status: MatchStatusEnum.CONFIRMED,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });
      const row = detail.gameHistory.find((item) => item.id === game.game.id);
      // The score is there to read; the result is not settled (ADR-0011).
      expect(row).toMatchObject({ viewerSlot: 1, outcome: null });
      expect(row?.scoredSets).toEqual([{ slot1GamesWon: 6, slot2GamesWon: 2 }]);
    } finally {
      await close();
    }
  });

  it("gives a Game the viewer did not play in no viewer slot and no result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "group-home-bystander@example.com");
      const one = await insertUser(db, "group-home-player-1@example.com");
      const two = await insertUser(db, "group-home-player-2@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, viewer.id, {
        members: [one.id, two.id],
      });

      const played = await insertGroupGame(db, {
        createdBy: one.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(48),
      });
      await seatAndScore(db, {
        gameId: played.game.id,
        matchId: played.matchId,
        slot1UserId: one.id,
        slot2UserId: two.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      const unscored = await insertGroupGame(db, {
        createdBy: one.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(24),
      });
      await seatAndScore(db, {
        gameId: unscored.game.id,
        matchId: unscored.matchId,
        slot1UserId: viewer.id,
        slot2UserId: one.id,
        sets: [],
        status: MatchStatusEnum.CONFIRMED,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });

      const bystanderRow = detail.gameHistory.find(
        (item) => item.id === played.game.id,
      );
      expect(bystanderRow).toMatchObject({ viewerSlot: null, outcome: null });
      expect(
        [
          ...(bystanderRow?.slot1Members ?? []),
          ...(bystanderRow?.slot2Members ?? []),
        ].some((member) => member.isViewer),
      ).toBe(false);
      expect(bystanderRow?.scoredSets).toEqual([
        { slot1GamesWon: 6, slot2GamesWon: 2 },
      ]);

      // Seated, but the Match carries no score: the row draws **Enter**.
      const awaitingRow = detail.gameHistory.find(
        (item) => item.id === unscored.game.id,
      );
      expect(awaitingRow).toMatchObject({ viewerSlot: 1, outcome: null });
      expect(awaitingRow?.scoredSets).toEqual([]);
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
      setNumber: await nextMatchSetNumber(database, args.matchId),
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
      expect(detail.totalGamesPlayed).toBe(3);
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

  it("returns each member's stored image on the leaderboard", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const photo = "https://img.clerk.com/standing-photo.png";
      const viewer = await insertUser(db, "standing-photo@example.com", {
        image: photo,
      });
      const rival = await insertUser(db, "standing-initials@example.com");
      const group = await insertGroup(db, viewer.id, { members: [rival.id] });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: viewer.id,
        now: NOW,
      });
      const byUserId = new Map(
        detail.standing.leaderboard.map((entry) => [entry.userId, entry]),
      );

      expect(byUserId.get(viewer.id)?.image).toBe(photo);
      expect(byUserId.get(rival.id)?.image).toBeNull();
    } finally {
      await close();
    }
  });

  it("counts completed Games as games played, and Games whose Match still awaits a score", async () => {
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
      expect(settled.totalGamesPlayed).toBe(1);

      const cancelled = await insertGroupGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        groupId: group.id,
        ...pastWindow(36),
      });
      await seatAndScore(db, {
        gameId: cancelled.game.id,
        matchId: cancelled.matchId,
        slot1UserId: viewer.id,
        slot2UserId: rival.id,
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 3 }],
      });
      await db
        .update(games)
        .set({ cancelledAt: NOW })
        .where(eq(games.id, cancelled.game.id));

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
      expect(detail.totalGamesPlayed).toBe(1);
    } finally {
      await close();
    }
  });
});

describe("groupById imageUrl", () => {
  it("returns a stored imageUrl when the column is set, and null otherwise", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "byid-image@example.com");
      const pictured = await insertGroup(db, viewer.id);
      const plain = await insertGroup(db, viewer.id);
      await db
        .update(groups)
        .set({
          imageUrl:
            "https://example.supabase.co/storage/v1/object/public/group-images/home/image",
        })
        .where(eq(groups.id, pictured.id));

      const picturedDetail = await groupById(db, {
        groupId: pictured.id,
        userId: viewer.id,
      });
      const plainDetail = await groupById(db, {
        groupId: plain.id,
        userId: viewer.id,
      });
      expect(picturedDetail.imageUrl).toBe(
        "https://example.supabase.co/storage/v1/object/public/group-images/home/image",
      );
      expect(plainDetail.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("groupById canManageImage", () => {
  it("is true only for a Group approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "byid-image-creator@example.com");
      const member = await insertUser(db, "byid-image-member@example.com");
      const group = await insertGroup(db, creator.id, {
        members: [member.id],
      });

      const asCreator = await groupById(db, {
        groupId: group.id,
        userId: creator.id,
      });
      const asMember = await groupById(db, {
        groupId: group.id,
        userId: member.id,
      });
      expect(asCreator.canManageImage).toBe(true);
      expect(asMember.canManageImage).toBe(false);
    } finally {
      await close();
    }
  });

  it("is false for a Club Group whose Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "byid-image-frozen@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Frozen Club",
          type: "public",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await db.insert(communitySports).values({
        communityId: community.id,
        sport: GroupSportEnum.PADEL,
      });
      await db.insert(communityMembers).values({
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });
      const group = await createClubPublic(db, {
        communityId: community.id,
        name: "Frozen Crew",
        sport: "padel",
        userId: owner.id,
      });
      await commit(db, { communityId: community.id }, "archived");

      const detail = await groupById(db, {
        groupId: group.id,
        userId: owner.id,
      });
      expect(detail.canManageImage).toBe(false);
    } finally {
      await close();
    }
  });
});
