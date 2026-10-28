import { getTableName, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  communities,
  communityMembers,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  levelOverrides,
  matchResultConfirmations,
  matchSets,
  matches,
  notifications,
  ratingEvents,
  ratings,
  user,
  userMerges,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { loadGroupStandingMembers } from "#src/standing/load-group-standing";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import {
  mergeIntoAccount,
  mergedUserReferenceColumns,
} from "#src/unclaimed-players/merge-into-account";

const PHONE = "+97336124408";
const MATCH_TIME = new Date("2024-01-10T12:00:00.000Z");

async function insertAccount(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}@example.com`, clerkId: `clerk_${name}` })
    .returning();
  if (!row) {
    throw new Error("Failed to insert account " + name);
  }
  return row;
}

async function seedPeople(database: TestDatabase) {
  const organizer = await insertAccount(database, "organizer");
  const survivor = await insertAccount(database, "survivor");
  const partner = await insertAccount(database, "partner");
  const oppLeft = await insertAccount(database, "oppleft");
  const oppRight = await insertAccount(database, "oppright");
  const { user: unclaimed } = await createUnclaimedPlayer(database, {
    phoneNumber: PHONE,
    name: "Ali typed by Organizer",
    addedByUserId: organizer.id,
    startingLevel: { sport: "padel", level: "C+" },
  });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Court Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  return {
    organizer,
    survivor,
    partner,
    oppLeft,
    oppRight,
    unclaimed,
    venueId: venue.id,
  };
}

type People = Awaited<ReturnType<typeof seedPeople>>;

async function insertGroup(database: TestDatabase, people: People) {
  const [group] = await database
    .insert(groups)
    .values({ name: "Night Crew", createdBy: people.organizer.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  return group.id;
}

async function insertGame(
  database: TestDatabase,
  people: People,
  groupId: string | null = null,
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Thursday Padel",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: people.venueId,
      groupId,
      createdBy: people.organizer.id,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: MATCH_TIME,
      windowEnd: new Date("2024-01-10T14:00:00.000Z"),
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }
  return game.id;
}

async function seat(
  database: TestDatabase,
  args: {
    gameId: string;
    gameTeamId: string;
    userId: string;
    position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum];
  },
) {
  const [row] = await database
    .insert(gamePlayers)
    .values({ gameId: args.gameId, userId: args.userId })
    .returning({ id: gamePlayers.id });
  if (!row) {
    throw new Error("Failed to insert seat");
  }
  await database.insert(gameTeamPlayers).values({
    gameTeamId: args.gameTeamId,
    gamePlayerId: row.id,
    position: args.position,
  });
  return row.id;
}

/** Seats both sides on the Game and records one completed Match, 6-4 to side 1. */
async function playCompletedMatch(
  database: TestDatabase,
  args: { gameId: string; side1: [string, string]; side2: [string, string] },
) {
  const [team1] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [team2] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!team1 || !team2) {
    throw new Error("Failed to insert game teams");
  }
  for (const [team, side] of [
    [team1, args.side1],
    [team2, args.side2],
  ] as const) {
    await seat(database, {
      gameId: args.gameId,
      gameTeamId: team.id,
      userId: side[0],
      position: GamePositionEnum.LEFT,
    });
    await seat(database, {
      gameId: args.gameId,
      gameTeamId: team.id,
      userId: side[1],
      position: GamePositionEnum.RIGHT,
    });
  }
  const [match] = await database
    .insert(matches)
    .values({
      gameId: args.gameId,
      startTime: MATCH_TIME,
      slot1GameTeamId: team1.id,
      slot2GameTeamId: team2.id,
      status: MatchStatusEnum.COMPLETED,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }
  await database.insert(matchSets).values({
    matchId: match.id,
    setNumber: 1,
    slot1GamesWon: 6,
    slot2GamesWon: 4,
  });
  return { matchId: match.id, team1Id: team1.id, team2Id: team2.id };
}

async function insertMatch(database: TestDatabase, gameId: string) {
  const [match] = await database
    .insert(matches)
    .values({ gameId, status: MatchStatusEnum.COMPLETED })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }
  return match.id;
}

async function replaceRatings(
  database: TestDatabase,
  args: { userId: string; sport: "padel" | "football"; mu: number },
) {
  await database.delete(ratings).where(eq(ratings.userId, args.userId));
  await addRatingRow(database, args);
}

async function addRatingRow(
  database: TestDatabase,
  args: { userId: string; sport: "padel" | "football"; mu: number },
) {
  await database.insert(ratings).values({
    userId: args.userId,
    sport: args.sport,
    mu: args.mu,
    phi: 1,
    sigma: 0.06,
    levelBand: "C2",
  });
}

async function addRatingEvents(
  database: TestDatabase,
  args: {
    userId: string;
    sport: "padel" | "football";
    matchIds: string[];
  },
) {
  for (const matchId of args.matchIds) {
    await database.insert(ratingEvents).values({
      userId: args.userId,
      sport: args.sport,
      matchId,
      outcomeScore: 1,
      weight: 1,
      muBefore: 0,
      phiBefore: 1,
      sigmaBefore: 0.06,
      muAfter: 0.1,
      phiAfter: 0.9,
      sigmaAfter: 0.06,
    });
  }
}

function merge(database: TestDatabase, people: People) {
  return mergeIntoAccount(database, {
    survivorUserId: people.survivor.id,
    mergedUserId: people.unclaimed.id,
    phoneNumber: PHONE,
  });
}

async function userRow(database: TestDatabase, id: string) {
  return database.query.user.findFirst({ where: eq(user.id, id) });
}

async function seatsOf(database: TestDatabase, userId: string) {
  return database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    with: { gameTeamPlayers: true },
  });
}

describe("mergeIntoAccount", () => {
  it("moves seats, memberships, Rating and confirmations to the account and deletes the Unclaimed row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const groupId = await insertGroup(db, people);
      await db
        .insert(groupMembers)
        .values({ groupId, userId: people.unclaimed.id });
      const [community] = await db
        .insert(communities)
        .values({ name: "Club", createdBy: people.organizer.id })
        .returning({ id: communities.id });
      await db
        .insert(communityMembers)
        .values({ communityId: community!.id, userId: people.unclaimed.id });
      const gameId = await insertGame(db, people, groupId);
      const { matchId } = await playCompletedMatch(db, {
        gameId,
        side1: [people.unclaimed.id, people.partner.id],
        side2: [people.oppLeft.id, people.oppRight.id],
      });
      await db
        .insert(matchResultConfirmations)
        .values({ matchId, userId: people.unclaimed.id });
      const [declared] = await db
        .select()
        .from(ratings)
        .where(eq(ratings.userId, people.unclaimed.id));

      const record = await merge(db, people);

      expect(record).not.toBeNull();
      expect(await userRow(db, people.unclaimed.id)).toBeUndefined();
      const survivor = await userRow(db, people.survivor.id);
      expect(survivor).toMatchObject({
        phoneNumber: PHONE,
        phoneNumberVerified: true,
        name: "survivor",
      });
      expect(survivor?.claimedAt).toBeInstanceOf(Date);

      const seats = await seatsOf(db, people.survivor.id);
      expect(seats).toHaveLength(1);
      expect(seats[0]?.gameId).toBe(gameId);
      expect(seats[0]?.gameTeamPlayers).toHaveLength(1);

      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, people.survivor.id),
      });
      expect(memberships.map((row) => row.groupId)).toEqual([groupId]);
      const communitySeats = await db.query.communityMembers.findMany({
        where: eq(communityMembers.userId, people.survivor.id),
      });
      expect(communitySeats.map((row) => row.communityId)).toEqual([
        community!.id,
      ]);

      const keptRatings = await db
        .select()
        .from(ratings)
        .where(eq(ratings.userId, people.survivor.id));
      expect(keptRatings).toHaveLength(1);
      expect(keptRatings[0]).toMatchObject({
        id: declared!.id,
        sport: "padel",
        mu: declared!.mu,
      });

      const confirmations = await db.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, matchId),
      });
      expect(confirmations.map((row) => row.userId)).toEqual([
        people.survivor.id,
      ]);
      expect(
        await db.query.matchSets.findMany({
          where: eq(matchSets.matchId, matchId),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("same Game: keeps the account's seat, drops the Unclaimed seat and its Position, and leaves the Match as recorded", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      const { matchId } = await playCompletedMatch(db, {
        gameId,
        side1: [people.survivor.id, people.partner.id],
        side2: [people.unclaimed.id, people.oppRight.id],
      });
      const [survivorSeat] = await seatsOf(db, people.survivor.id);
      const [unclaimedSeat] = await seatsOf(db, people.unclaimed.id);

      const record = await merge(db, people);

      expect(record?.summary).toMatchObject({
        seatsMoved: 0,
        seatsDropped: 1,
      });
      const seats = await seatsOf(db, people.survivor.id);
      expect(seats.map((row) => row.id)).toEqual([survivorSeat!.id]);
      expect(seats[0]?.gameTeamPlayers).toHaveLength(1);
      expect(
        await db.query.gameTeamPlayers.findMany({
          where: eq(gameTeamPlayers.gamePlayerId, unclaimedSeat!.id),
        }),
      ).toHaveLength(0);
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
        with: { sets: true },
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.sets).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("same Group: keeps one membership and the Standing is recalculated from both players' Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const groupId = await insertGroup(db, people);
      for (const member of [
        people.survivor,
        people.unclaimed,
        people.partner,
        people.oppLeft,
        people.oppRight,
      ]) {
        await db.insert(groupMembers).values({ groupId, userId: member.id });
      }
      const [survivorMembership] = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(eq(groupMembers.userId, people.survivor.id));
      const survivorGame = await insertGame(db, people, groupId);
      await playCompletedMatch(db, {
        gameId: survivorGame,
        side1: [people.survivor.id, people.partner.id],
        side2: [people.oppLeft.id, people.oppRight.id],
      });
      const unclaimedGame = await insertGame(db, people, groupId);
      await playCompletedMatch(db, {
        gameId: unclaimedGame,
        side1: [people.unclaimed.id, people.partner.id],
        side2: [people.oppLeft.id, people.oppRight.id],
      });

      const record = await merge(db, people);

      expect(record?.summary.membershipsMoved).toBe(0);
      const rows = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, groupId),
      });
      expect(rows).toHaveLength(4);
      expect(
        rows.filter((row) => row.userId === people.survivor.id),
      ).toMatchObject([{ id: survivorMembership!.id }]);
      const standing =
        (await loadGroupStandingMembers(db, [groupId])).get(groupId) ?? [];
      expect(
        standing.find((row) => row.userId === people.survivor.id),
      ).toMatchObject({ totalGamesPlayed: 2, totalSetsWon: 2 });
    } finally {
      await close();
    }
  });

  it("same Community: keeps the account's Member seat and its role", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const [community] = await db
        .insert(communities)
        .values({ name: "Club", createdBy: people.organizer.id })
        .returning({ id: communities.id });
      await db.insert(communityMembers).values([
        {
          communityId: community!.id,
          userId: people.survivor.id,
          role: CommunityRoleEnum.ADMIN,
        },
        { communityId: community!.id, userId: people.unclaimed.id },
      ]);

      const record = await merge(db, people);

      expect(record?.summary.membershipsMoved).toBe(0);
      const rows = await db.query.communityMembers.findMany({
        where: eq(communityMembers.communityId, community!.id),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        userId: people.survivor.id,
        role: CommunityRoleEnum.ADMIN,
      });
    } finally {
      await close();
    }
  });

  it("both rated per sport: the Rating with more Rated Matches stays with its events, and the account's wins a tie", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      const [m1, m2, m3, m4] = await Promise.all(
        Array.from({ length: 4 }, () => insertMatch(db, gameId)),
      );

      await replaceRatings(db, {
        userId: people.survivor.id,
        sport: "padel",
        mu: 1,
      });
      await addRatingEvents(db, {
        userId: people.survivor.id,
        sport: "padel",
        matchIds: [m1!],
      });
      await replaceRatings(db, {
        userId: people.unclaimed.id,
        sport: "padel",
        mu: 2,
      });
      await addRatingEvents(db, {
        userId: people.unclaimed.id,
        sport: "padel",
        matchIds: [m1!, m2!],
      });
      await db.insert(levelOverrides).values({
        userId: people.survivor.id,
        sport: "padel",
        setByUserId: people.organizer.id,
        hadRating: true,
        muBefore: 0,
        phiBefore: 1,
        sigmaBefore: 0.06,
        levelBandBefore: "C2",
        muAfter: 1,
        phiAfter: 1,
        sigmaAfter: 0.06,
        levelBandAfter: "C2",
      });

      await addRatingRow(db, {
        userId: people.survivor.id,
        sport: "football",
        mu: 3,
      });
      await addRatingEvents(db, {
        userId: people.survivor.id,
        sport: "football",
        matchIds: [m3!],
      });
      await addRatingRow(db, {
        userId: people.unclaimed.id,
        sport: "football",
        mu: 4,
      });
      await addRatingEvents(db, {
        userId: people.unclaimed.id,
        sport: "football",
        matchIds: [m4!],
      });

      const record = await merge(db, people);

      expect(record?.summary.ratingKeptBySport).toEqual({
        padel: "merged",
        football: "survivor",
      });
      const kept = await db
        .select({ sport: ratings.sport, mu: ratings.mu })
        .from(ratings)
        .where(eq(ratings.userId, people.survivor.id));
      expect(kept.sort((a, b) => a.sport.localeCompare(b.sport))).toEqual([
        { sport: "football", mu: 3 },
        { sport: "padel", mu: 2 },
      ]);
      const events = await db
        .select({ sport: ratingEvents.sport, matchId: ratingEvents.matchId })
        .from(ratingEvents)
        .where(eq(ratingEvents.userId, people.survivor.id));
      expect(
        events.filter((row) => row.sport === "padel").map((row) => row.matchId),
      ).toEqual(expect.arrayContaining([m1, m2]));
      expect(events.filter((row) => row.sport === "padel")).toHaveLength(2);
      expect(
        events
          .filter((row) => row.sport === "football")
          .map((row) => row.matchId),
      ).toEqual([m3]);
      expect(
        await db.query.levelOverrides.findMany({
          where: eq(levelOverrides.userId, people.survivor.id),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("keeps the account's Rating when it has more Rated Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      const [m1, m2] = await Promise.all([
        insertMatch(db, gameId),
        insertMatch(db, gameId),
      ]);
      await replaceRatings(db, {
        userId: people.survivor.id,
        sport: "padel",
        mu: 1,
      });
      await addRatingEvents(db, {
        userId: people.survivor.id,
        sport: "padel",
        matchIds: [m1!, m2!],
      });
      await addRatingEvents(db, {
        userId: people.unclaimed.id,
        sport: "padel",
        matchIds: [m1!],
      });

      const record = await merge(db, people);

      expect(record?.summary.ratingKeptBySport).toEqual({ padel: "survivor" });
      const kept = await db
        .select({ mu: ratings.mu })
        .from(ratings)
        .where(eq(ratings.userId, people.survivor.id));
      expect(kept).toEqual([{ mu: 1 }]);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.userId, people.survivor.id),
        }),
      ).toHaveLength(2);
    } finally {
      await close();
    }
  });

  it("waitlisted on the same Game: keeps one Waitlist entry, the account's", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      const [survivorEntry] = await db
        .insert(gameWaitlist)
        .values({ gameId, userId: people.survivor.id })
        .returning({ id: gameWaitlist.id });
      await db
        .insert(gameWaitlist)
        .values({ gameId, userId: people.unclaimed.id });

      await merge(db, people);

      const rows = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, gameId),
      });
      expect(rows.map((row) => [row.id, row.userId])).toEqual([
        [survivorEntry!.id, people.survivor.id],
      ]);
    } finally {
      await close();
    }
  });

  it("drops the account's Waitlist entry on a Game where the Unclaimed seat moves to it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      await db
        .insert(gameWaitlist)
        .values({ gameId, userId: people.survivor.id });
      await db
        .insert(gamePlayers)
        .values({ gameId, userId: people.unclaimed.id });

      await merge(db, people);

      expect(await seatsOf(db, people.survivor.id)).toHaveLength(1);
      expect(
        await db.query.gameWaitlist.findMany({
          where: eq(gameWaitlist.gameId, gameId),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("writes one user_merges row with the summary", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const groupId = await insertGroup(db, people);
      await db
        .insert(groupMembers)
        .values({ groupId, userId: people.unclaimed.id });
      const shared = await insertGame(db, people);
      await db.insert(gamePlayers).values([
        { gameId: shared, userId: people.survivor.id },
        { gameId: shared, userId: people.unclaimed.id },
      ]);
      for (let index = 0; index < 2; index += 1) {
        const gameId = await insertGame(db, people);
        await db
          .insert(gamePlayers)
          .values({ gameId, userId: people.unclaimed.id });
      }

      await merge(db, people);

      const rows = await db.select().from(userMerges);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        survivorUserId: people.survivor.id,
        mergedUserId: people.unclaimed.id,
        phoneNumber: PHONE,
        summary: {
          seatsMoved: 2,
          seatsDropped: 1,
          membershipsMoved: 1,
          ratingKeptBySport: { padel: "merged" },
        },
      });
      expect(rows[0]?.mergedAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });

  it("writes one history_linked Notification counting the Games that moved", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const shared = await insertGame(db, people);
      await db.insert(gamePlayers).values([
        { gameId: shared, userId: people.survivor.id },
        { gameId: shared, userId: people.unclaimed.id },
      ]);
      const moved = await insertGame(db, people);
      await db
        .insert(gamePlayers)
        .values({ gameId: moved, userId: people.unclaimed.id });

      await merge(db, people);

      const rows = await db.query.notifications.findMany({
        where: eq(notifications.type, "history_linked"),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        recipientUserId: people.survivor.id,
        audience: "player",
        gameCount: 1,
      });
    } finally {
      await close();
    }
  });

  it("writes no Notification when no Game moved", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);

      await merge(db, people);

      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.type, "history_linked"),
        }),
      ).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("does nothing on a second run: no second user_merges row or Notification", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const gameId = await insertGame(db, people);
      await db
        .insert(gamePlayers)
        .values({ gameId, userId: people.unclaimed.id });

      await merge(db, people);
      expect(await merge(db, people)).toBeNull();

      expect(await db.select().from(userMerges)).toHaveLength(1);
      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.type, "history_linked"),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("refuses an account row as the merged player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      await db
        .update(user)
        .set({ phoneNumber: "+97339990000" })
        .where(eq(user.id, people.partner.id));

      const record = await mergeIntoAccount(db, {
        survivorUserId: people.survivor.id,
        mergedUserId: people.partner.id,
        phoneNumber: "+97339990000",
      });

      expect(record).toBeNull();
      expect(await userRow(db, people.partner.id)).toBeDefined();
    } finally {
      await close();
    }
  });

  it("rolls the whole merge back when a step fails, leaving both rows as they were", async () => {
    const { db, client, close } = await createPgliteDb();
    try {
      const people = await seedPeople(db);
      const groupId = await insertGroup(db, people);
      await db
        .insert(groupMembers)
        .values({ groupId, userId: people.unclaimed.id });
      const gameId = await insertGame(db, people, groupId);
      await playCompletedMatch(db, {
        gameId,
        side1: [people.unclaimed.id, people.partner.id],
        side2: [people.oppLeft.id, people.oppRight.id],
      });
      const both = [people.survivor.id, people.unclaimed.id];
      async function snapshot() {
        return {
          users: await db
            .select()
            .from(user)
            .where(inArray(user.id, both))
            .orderBy(user.id),
          seats: await db.select().from(gamePlayers).orderBy(gamePlayers.id),
          positions: await db
            .select()
            .from(gameTeamPlayers)
            .orderBy(gameTeamPlayers.id),
          members: await db
            .select()
            .from(groupMembers)
            .orderBy(groupMembers.id),
          ratings: await db.select().from(ratings).orderBy(ratings.id),
          notifications: await db.select().from(notifications),
        };
      }
      const before = await snapshot();
      await client.exec(`
        create function fail_user_merge() returns trigger language plpgsql as $$
        begin
          raise exception 'forced merge failure';
        end;
        $$;
        create trigger fail_user_merge before insert on user_merges
          for each row execute function fail_user_merge();
      `);

      await expect(merge(db, people)).rejects.toThrow(/forced merge failure/);

      expect(await snapshot()).toEqual(before);
      expect(await db.select().from(userMerges)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("covers every foreign key that references user", async () => {
    const { client, close } = await createPgliteDb();
    try {
      const result = await client.query<{ table: string; column: string }>(`
        select cl.relname as table, a.attname as column
        from pg_constraint c
        join pg_class cl on cl.oid = c.conrelid
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
        where c.contype = 'f' and c.confrelid = 'public."user"'::regclass
      `);
      const inSchema = result.rows
        .map((row) => `${row.table}.${row.column}`)
        .sort();
      const handled = mergedUserReferenceColumns
        .map((column) => `${getTableName(column.table)}.${column.name}`)
        .sort();

      expect(handled).toEqual(inSchema);
    } finally {
      await close();
    }
  });
});
