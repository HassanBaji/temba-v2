import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  games,
  groupMembers,
  groupRatingEvents,
  groupTierEvents,
  groupTierPoints,
  groups,
  matches,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { type GameRow } from "#src/games/access";
import { setUpMatch } from "#src/ratings/group-rated-match.test-support";
import { applyRatedMatch } from "#src/ratings/apply-rated-match";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";

const HOUR = 60 * 60 * 1000;
const AFTER_KICKOFF = () => new Date(Date.now() + 3 * HOUR);

type Fixture = {
  db: TestDatabase;
  organizerId: string;
  groupId: string;
  gameId: string;
};

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function footballGroup(
  database: TestDatabase,
  options: { verified?: boolean } = {},
) {
  const organizerId = await insertUser(database, "organizer");
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Thursday Football",
      createdBy: organizerId,
      sport: "football",
      verifiedAt: options.verified ? new Date() : null,
    })
    .returning({ id: groups.id });
  await database
    .insert(groupMembers)
    .values({ groupId: group!.id, userId: organizerId });
  return {
    organizerId,
    groupId: group!.id,
    venueId: venue!.id,
    pitchId: pitch!.id,
  };
}

async function footballGame(
  database: TestDatabase,
  options: { verified?: boolean; rated?: boolean } = {},
): Promise<Fixture> {
  const group = await footballGroup(database, options);
  const windowStart = new Date(Date.now() + HOUR);
  const created = await createGame(database, {
    createdBy: group.organizerId,
    groupId: group.groupId,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: group.venueId,
    courtId: group.pitchId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + HOUR),
    ...(options.rated === false ? { rated: false } : {}),
  });
  return {
    db: database,
    organizerId: group.organizerId,
    groupId: group.groupId,
    gameId: created.id,
  };
}

async function addMember(f: Fixture, name: string) {
  const userId = await insertUser(f.db, name);
  await f.db.insert(groupMembers).values({ groupId: f.groupId, userId });
  await register(f.db, { gameId: f.gameId, userId });
  return userId;
}

async function addUnclaimed(f: Fixture, phoneNumber: string) {
  const created = await f.db.transaction((tx) =>
    createUnclaimedPlayer(tx, {
      phoneNumber,
      name: `Unclaimed ${phoneNumber}`,
      addedByUserId: f.organizerId,
      startingLevel: { sport: "football", placement: "competitive" },
    }),
  );
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.groupId, userId: created.user.id });
  await register(f.db, { gameId: f.gameId, userId: created.user.id });
  return created.user.id;
}

async function playScore(
  f: Fixture,
  slot1: string[],
  slot2: string[],
  score: { slot1: number; slot2: number },
) {
  await publishFootballTeams(f.db, {
    gameId: f.gameId,
    userId: f.organizerId,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1,
    slot2,
  });
  await saveFootballScore(
    f.db,
    {
      gameId: f.gameId,
      userId: f.organizerId,
      slot1Goals: score.slot1,
      slot2Goals: score.slot2,
      scorers: [],
    },
    AFTER_KICKOFF(),
  );
  const match = await f.db.query.matches.findFirst({
    where: eq(matches.gameId, f.gameId),
  });
  await confirmMatchResult(f.db, {
    gameId: f.gameId,
    matchId: match!.id,
    userId: f.organizerId,
  });
  return match!.id;
}

async function tierEvents(database: TestDatabase, matchId: string) {
  return database.query.groupTierEvents.findMany({
    where: eq(groupTierEvents.matchId, matchId),
  });
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

describe("Tier points on a completed football Match (ADR-0067)", () => {
  it("writes one game event per seated player, Unclaimed included, and no Rating event", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const unclaimed = await addUnclaimed(f, "+97336100001");
      const matchId = await playScore(f, [a, b], [c, unclaimed], {
        slot1: 3,
        slot2: 1,
      });

      const game = await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      expect(game).toMatchObject({ rated: false, groupRated: true });

      const events = await tierEvents(db, matchId);
      const games_ = events.filter((event) => event.kind === "game");
      expect(games_.map((event) => event.userId).sort()).toEqual(
        [a, b, c, unclaimed].sort(),
      );
      for (const event of games_) {
        expect(event.pointsAfter).toBe(event.pointsBefore + event.delta);
        expect(event.performanceDelta).toBe(0);
        expect(event.delta).toBe(event.resultDelta);
        expect(event.pointsBefore).toBe(1200);
        expect(event.expectedScore).toBe(0.5);
      }
      const deltaOf = (userId: string) =>
        games_.find((event) => event.userId === userId)?.delta;
      expect(deltaOf(a)).toBe(24);
      expect(deltaOf(unclaimed)).toBe(-24);

      const rows = await db.query.groupTierPoints.findMany({
        where: eq(groupTierPoints.groupId, f.groupId),
      });
      expect(
        rows.map((row) => [row.userId, row.points, row.gamesCounted]).sort(),
      ).toEqual(
        [
          [a, 1224, 1],
          [b, 1224, 1],
          [c, 1176, 1],
          [unclaimed, 1176, 1],
        ].sort(),
      );
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.groupRatingEvents.findMany({
          where: eq(groupRatingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("writes nothing when the same Match completes a second time", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 2, slot2: 2 });
      const before = await tierEvents(db, matchId);
      const pointsBefore = await db.query.groupTierPoints.findMany();

      const game = (await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      })) as GameRow;
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      await applyRatedMatch(db, game, match!, "draw");
      await applyRatedMatch(db, game, match!, "slot1");

      expect(await tierEvents(db, matchId)).toEqual(before);
      expect(await db.query.groupTierPoints.findMany()).toEqual(pointsBefore);
    });
  });

  it("writes a band_change event when a Match moves someone's fish", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const p1 = await addMember(f, "p1");
      const p2 = await addMember(f, "p2");
      const p3 = await insertUser(db, "p3");
      const p4 = await insertUser(db, "p4");
      await db.insert(groupMembers).values([
        { groupId: f.groupId, userId: p3 },
        { groupId: f.groupId, userId: p4 },
      ]);
      await db.insert(groupTierPoints).values([
        {
          groupId: f.groupId,
          userId: p1,
          points: 1300,
          gamesCounted: 9,
          band: "shark",
        },
        {
          groupId: f.groupId,
          userId: p2,
          points: 1290,
          gamesCounted: 9,
          band: "kanaad",
        },
        {
          groupId: f.groupId,
          userId: p3,
          points: 1200,
          gamesCounted: 9,
          band: "safi",
        },
        {
          groupId: f.groupId,
          userId: p4,
          points: 1100,
          gamesCounted: 9,
          band: "safi",
        },
      ]);

      const matchId = await playScore(f, [p2], [p1], { slot1: 4, slot2: 0 });

      const changes = (await tierEvents(db, matchId))
        .filter((event) => event.kind === "band_change")
        .map((event) => [event.userId, event.bandBefore, event.bandAfter]);
      expect(changes.sort()).toEqual(
        [
          [p1, "shark", "kanaad"],
          [p2, "kanaad", "shark"],
        ].sort(),
      );
      const winner = await db.query.groupTierEvents.findFirst({
        where: and(
          eq(groupTierEvents.matchId, matchId),
          eq(groupTierEvents.userId, p2),
          eq(groupTierEvents.kind, "game"),
        ),
      });
      expect(winner).toMatchObject({
        bandBefore: "kanaad",
        bandAfter: "shark",
        placeAfter: 1,
        rankedCount: 4,
      });
      const stored = await db.query.groupTierPoints.findFirst({
        where: eq(groupTierPoints.userId, p2),
      });
      expect(stored?.band).toBe("shark");
    });
  });

  it("writes no tier event on a Verified Group or an Unrated football Game", async () => {
    await withDb(async (db) => {
      for (const options of [{ verified: true }, { rated: false }]) {
        const f = await footballGame(db, options);
        const a = await addMember(f, `a${crypto.randomUUID()}`);
        const b = await addMember(f, `b${crypto.randomUUID()}`);
        const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
        expect(await tierEvents(db, matchId)).toHaveLength(0);
      }
      expect(await db.query.groupTierPoints.findMany()).toHaveLength(0);
    });
  });

  it("writes no tier event for a padel Game", async () => {
    await withDb(async (db) => {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });
      await completeMatch(db, { gameId, matchId, userId: a.id });
      expect(
        await db.query.groupRatingEvents.findMany({
          where: eq(groupRatingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(await db.query.groupTierPoints.findMany()).toHaveLength(0);
    });
  });
});
