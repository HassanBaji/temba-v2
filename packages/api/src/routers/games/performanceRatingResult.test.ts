import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupMembers,
  groupTierEvents,
  groupTierPoints,
  matchRatingWindows,
  notifications,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import {
  addMember,
  footballGame,
  insertUser,
  playScore,
  registerOrganizer,
  setRatingSettings,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { setMvp } from "#src/routers/marks/setMvp";

import { performanceRatingResult } from "./performanceRatingResult";
import { submitPerformanceRatings } from "./submitPerformanceRatings";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function windowOf(database: TestDatabase, matchId: string) {
  const window = await database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
  });
  if (!window) {
    throw new Error("Expected a Rating window");
  }
  return window;
}

async function gameEvent(
  database: TestDatabase,
  matchId: string,
  userId: string,
) {
  const event = await database.query.groupTierEvents.findFirst({
    where: and(
      eq(groupTierEvents.matchId, matchId),
      eq(groupTierEvents.userId, userId),
      eq(groupTierEvents.kind, "game"),
    ),
  });
  if (!event) {
    throw new Error("Expected a game event");
  }
  return event;
}

function resultFor(f: FootballFixture, userId: string, now?: Date) {
  return performanceRatingResult(f.db, { gameId: f.gameId, userId }, now);
}

/** The Organizer plays with a and b against c and d, and wins 3–1. */
async function organizerRatedGame(database: TestDatabase) {
  const f = await footballGame(database);
  await setRatingSettings(f, { mode: "organizer", weightPercent: 30 });
  const o = await registerOrganizer(f);
  const a = await addMember(f, "a");
  const b = await addMember(f, "b");
  const c = await addMember(f, "c");
  const d = await addMember(f, "d");
  const matchId = await playScore(f, [o, a, b], [c, d], {
    slot1: 3,
    slot2: 1,
  });
  return { f, matchId, o, a, b, c, d };
}

describe("games.performanceRatingResult (screen 4c)", () => {
  recordJobs();

  it("returns the closing time and no rating before the window settles", async () => {
    await withDb(async (db) => {
      const { f, matchId, a } = await organizerRatedGame(db);
      const window = await windowOf(db, matchId);

      expect(await resultFor(f, a)).toEqual({
        state: "open",
        mode: "organizer",
        closesAt: window.closesAt,
        played: true,
        countsForLevel: false,
        result: null,
      });
    });
  });

  it("shows the settled rating, and two parts that add up to the stored move", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a, b, c } = await organizerRatedGame(db);
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [
          { userId: a, value: 9 },
          { userId: b, value: 5 },
          { userId: c, value: 7 },
        ],
      });

      const data = await resultFor(f, a);
      expect(data.state).toBe("settled");
      const result = data.result!;
      const stored = await gameEvent(db, matchId, a);
      expect(result).toMatchObject({
        groupName: "Thursday Football",
        score: { slot1: 3, slot2: 1 },
        bibs: { slot1: "black", slot2: "white" },
        viewerSide: 1,
        weightPercent: 30,
        rating: {
          hundredths: 900,
          ballotsReceived: 1,
          trimmed: false,
          organizerCountedDouble: false,
        },
        noRating: null,
        delta: stored.delta,
        pointsBefore: stored.pointsBefore,
        pointsAfter: stored.pointsAfter,
      });
      expect(result.resultDelta + result.performanceDelta).toBe(stored.delta);
      expect(result.resultDelta).toBe(stored.resultDelta);
      expect(result.performanceDelta).toBe(stored.performanceDelta);
      expect(result.performanceDelta).toBeGreaterThan(0);
      expect(result.rating?.gameAverageHundredths).toBe(700);
      expect(result.tier).toMatchObject({
        placeAfter: null,
        gamesOfFive: 1,
      });

      const loser = (await resultFor(f, c)).result!;
      expect(loser.viewerSide).toBe(2);
      expect(loser.resultDelta + loser.performanceDelta).toBe(loser.delta);
    });
  });

  it("says the place before and after, and the points to the next fish", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "organizer", weightPercent: 30 });
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const d = await addMember(f, "d");
      const start: [string, number][] = [
        [c, 1300],
        [d, 1250],
        [o, 1200],
        [a, 1190],
        [b, 1180],
      ];
      await db.insert(groupTierPoints).values(
        start.map(([userId, points]) => ({
          groupId: f.groupId,
          userId,
          points,
          confirmedAt: new Date(),
        })),
      );
      const matchId = await playScore(f, [o, a, b], [c, d], {
        slot1: 3,
        slot2: 1,
      });
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [
          { userId: a, value: 9 },
          { userId: b, value: 6 },
          { userId: c, value: 6 },
          { userId: d, value: 6 },
        ],
      });

      const stored = await gameEvent(db, matchId, a);
      const { tier } = (await resultFor(f, a)).result!;
      expect(tier).toMatchObject({
        placeBefore: 4,
        placeAfter: stored.placeAfter,
        rankedCount: 5,
        bandAfter: stored.bandAfter,
      });
      expect(tier.placeAfter).not.toBeNull();
      expect(tier.bandAfter).not.toBeNull();
      expect(tier.nextBand === null).toBe(tier.pointsToNextBand === null);
      expect((await resultFor(f, c)).result?.tier.placeBefore).toBe(1);
    });
  });

  it("gives a player with no performance part the result part and the reason", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a, d } = await organizerRatedGame(db);
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [{ userId: a, value: 8 }],
      });

      const organizer = (await resultFor(f, o)).result!;
      expect(organizer.rating).toBeNull();
      expect(organizer.noRating).toEqual({
        reason: "organizer_rated",
        ballotsReceived: 0,
      });
      expect(organizer.performanceDelta).toBe(0);
      expect(organizer.resultDelta).toBe(
        (await gameEvent(db, matchId, o)).delta,
      );

      const unrated = (await resultFor(f, d)).result!;
      expect(unrated.noRating?.reason).toBe("organizer_did_not_rate");
      expect(unrated.performanceDelta).toBe(0);
      expect(unrated.resultDelta).toBe(unrated.delta);
    });
  });

  it("when everyone rates, counts the ballots received and says when too few came", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, {
        mode: "everyone",
        weightPercent: 30,
        organizerCountsDouble: true,
      });
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const d = await addMember(f, "d");
      const e = await addMember(f, "e");
      const matchId = await playScore(f, [o, a, b], [c, d, e], {
        slot1: 2,
        slot2: 1,
      });
      const rate = (rater: string, ratings: [string, number][]) =>
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: rater,
          ratings: ratings.map(([userId, value]) => ({ userId, value })),
        });
      await rate(o, [[a, 9]]);
      await rate(b, [
        [a, 7],
        [c, 6],
      ]);
      await rate(c, [[a, 8]]);
      await rate(d, [
        [a, 6],
        [c, 7],
      ]);
      await rate(e, [[a, 7]]);

      const { closesAt } = await windowOf(db, matchId);
      const late = new Date(closesAt.getTime() + 60_000);
      const rated = await resultFor(f, a, late);
      expect(rated.state).toBe("settled");
      expect(rated.result?.rating).toMatchObject({
        ballotsReceived: 5,
        trimmed: true,
        organizerCountedDouble: true,
      });

      const tooFew = (await resultFor(f, c, late)).result!;
      expect(tooFew.rating).toBeNull();
      expect(tooFew.noRating).toEqual({
        reason: "too_few_ballots",
        ballotsReceived: 2,
      });
      expect(tooFew.resultDelta + tooFew.performanceDelta).toBe(tooFew.delta);
      expect(tooFew.performanceDelta).toBe(0);
    });
  });

  it("names the MVP with the rating they settled at", async () => {
    await withDb(async (db) => {
      const { f, o, a, b } = await organizerRatedGame(db);
      await db
        .update(games)
        .set({ mvpMode: "organizer" })
        .where(eq(games.id, f.gameId));
      await setMvp(db, { gameId: f.gameId, userId: o, mvpUserId: a });
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [
          { userId: a, value: 9 },
          { userId: b, value: 6 },
        ],
      });

      const { mvp } = (await resultFor(f, b)).result!;
      expect(mvp).toMatchObject({
        name: "a",
        isViewer: false,
        decidedBy: "organizer",
        votes: null,
        ratingHundredths: 900,
      });
      expect((await resultFor(f, a)).result?.mvp?.isViewer).toBe(true);
    });
  });

  it("gives no result to a member who did not play", async () => {
    await withDb(async (db) => {
      const { f, o, a } = await organizerRatedGame(db);
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [{ userId: a, value: 8 }],
      });
      const watcher = await insertUser(db, "watcher");
      await db
        .insert(groupMembers)
        .values({ groupId: f.groupId, userId: watcher.id });

      expect(await resultFor(f, watcher.id)).toMatchObject({
        state: "settled",
        played: false,
        result: null,
      });
    });
  });

  it("refuses a Game whose Group does not rate performance", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await playScore(f, [a], [b], { slot1: 1, slot2: 0 });

      const error = await resultFor(f, a).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("PRECONDITION_FAILED");
    });
  });
});

describe("performance_ratings_closed (ADR-0068)", () => {
  recordJobs();

  it("tells each seated account holder their own move once, when the window settles", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a, b, c, d } = await organizerRatedGame(db);
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [{ userId: a, value: 8 }],
      });
      await resultFor(f, a);

      const sent = await db.query.notifications.findMany({
        where: eq(notifications.type, "performance_ratings_closed"),
      });
      expect(sent.map((row) => row.recipientUserId).sort()).toEqual(
        [o, a, b, c, d].sort(),
      );
      for (const row of sent) {
        expect(row).toMatchObject({
          audience: "player",
          gameId: f.gameId,
          groupId: f.groupId,
          groupTierEventId: (await gameEvent(db, matchId, row.recipientUserId))
            .id,
        });
      }
    });
  });
});
