import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupTierEvents,
  groupTierPoints,
  matchRatingWindows,
  notifications,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { TIER_K, tierExpectedScore } from "@repo/domain/tier-points";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { ratingWindowSettleJobKey } from "#src/jobs/specs";
import {
  addMember,
  footballGame,
  playScore,
  registerOrganizer,
  setRatingSettings,
  tierEvents,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";

import {
  settleRatingWindow,
  settleRatingWindowIfDue,
} from "./settle-rating-window";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function windowOf(database: TestDatabase, matchId: string) {
  return database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
  });
}

function gameEventsByUser(events: Awaited<ReturnType<typeof tierEvents>>) {
  return new Map(
    events
      .filter((event) => event.kind === "game")
      .map((event) => [event.userId, event]),
  );
}

/** The Organizer and two members beat two members 2–1. */
async function playedGame(
  database: TestDatabase,
  settings: Parameters<typeof setRatingSettings>[1],
) {
  const f = await footballGame(database);
  await setRatingSettings(f, settings);
  const o = await registerOrganizer(f);
  const a = await addMember(f, "a");
  const b = await addMember(f, "b");
  const c = await addMember(f, "c");
  const d = await addMember(f, "d");
  const matchId = await playScore(f, [o, a, b], [c, d], {
    slot1: 2,
    slot2: 1,
  });
  return { f, matchId, o, a, b, c, d };
}

async function rate(
  database: TestDatabase,
  matchId: string,
  rows: [rater: string, ratee: string, value: number][],
) {
  await database.insert(performanceRatings).values(
    rows.map(([raterUserId, rateeUserId, value]) => ({
      matchId,
      raterUserId,
      rateeUserId,
      value,
    })),
  );
}

describe("Rating windows (ADR-0068)", () => {
  const jobs = recordJobs();

  it("in Off mode writes the move at completion and opens no window", async () => {
    await withDb(async (db) => {
      const { matchId } = await playedGame(db, { mode: "off" });
      expect(await windowOf(db, matchId)).toBeUndefined();
      const events = gameEventsByUser(await tierEvents(db, matchId));
      expect(events.size).toBe(5);
      expect(
        [...events.values()].every((event) => event.performanceDelta === 0),
      ).toBe(true);
      expect(
        jobs.added.some((job) => job.name === "rating-window.settle"),
      ).toBe(false);
    });
  });

  it("opens a window with a settings snapshot at completion and holds the move", async () => {
    await withDb(async (db) => {
      const { f, matchId } = await playedGame(db, {
        mode: "organizer",
        weightPercent: 50,
      });
      const window = await windowOf(db, matchId);
      expect(window).toMatchObject({
        mode: "organizer",
        weightPercent: 50,
        organizerCountsDouble: false,
        countsForLevel: false,
        settledAt: null,
        suspendedAt: null,
      });
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      const job = jobs.added.find((row) => row.name === "rating-window.settle");
      expect(job).toMatchObject({
        key: ratingWindowSettleJobKey(matchId),
        payload: { matchId },
        runAt: window!.closesAt,
      });

      await setRatingSettings(f, { mode: "off" });
      expect((await windowOf(db, matchId))?.mode).toBe("organizer");

      const sent = await db.query.notifications.findMany({
        where: eq(notifications.type, "performance_ratings_open"),
      });
      expect(sent.map((row) => [row.recipientUserId, row.audience])).toEqual([
        [f.organizerId, "admin"],
      ]);
    });
  });

  it("after 24 hours with no submit, everyone moves on the result alone", async () => {
    await withDb(async (db) => {
      const { matchId } = await playedGame(db, { mode: "organizer" });
      const window = await windowOf(db, matchId);
      const early = new Date(window!.closesAt.getTime() - 1000);
      expect(await settleRatingWindow(db, matchId, early)).toBe(false);
      expect(await tierEvents(db, matchId)).toHaveLength(0);

      expect(await settleRatingWindow(db, matchId, window!.closesAt)).toBe(
        true,
      );
      const events = gameEventsByUser(await tierEvents(db, matchId));
      expect(events.size).toBe(5);
      for (const event of events.values()) {
        expect(event.performanceDelta).toBe(0);
        expect(event.ratingHundredths).toBeNull();
      }
      expect((await windowOf(db, matchId))?.settledAt).toEqual(
        window!.closesAt,
      );
      expect(await settleRatingWindow(db, matchId, window!.closesAt)).toBe(
        false,
      );
      expect(await tierEvents(db, matchId)).toHaveLength(events.size);
    });
  });

  it("with weight 30, a win at 0.46 rated 7.4 against a usual 6.8 moves +12 for the result and +6 for the play", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a, b, c, d } = await playedGame(db, {
        mode: "everyone",
        weightPercent: 30,
        organizerCountsDouble: true,
      });
      // Slot 2 holds 28 more points on average, which makes slot 1's chance 0.46.
      await db.insert(groupTierPoints).values(
        [o, a, b, c, d].map((userId) => ({
          groupId: f.groupId,
          userId,
          points: userId === c || userId === d ? 1228 : 1200,
          gamesCounted: 5,
        })),
      );
      // a's two earlier rated games of 8 give a usual of 6.8.
      await db.insert(groupTierEvents).values(
        [0, 1].map((index) => ({
          groupId: f.groupId,
          userId: a,
          kind: "game" as const,
          pointsBefore: 1200,
          pointsAfter: 1200,
          ratingHundredths: 800,
          createdAt: new Date(Date.now() - (index + 1) * 86_400_000),
        })),
      );
      await rate(db, matchId, [
        [o, a, 8],
        [b, a, 7],
        [c, a, 7],
        [d, a, 7],
        [o, b, 6],
        [a, b, 5],
        [c, b, 5],
        [d, b, 5],
      ]);
      const window = await windowOf(db, matchId);
      expect(await settleRatingWindow(db, matchId, window!.closesAt)).toBe(
        true,
      );

      const expected = tierExpectedScore(1200, 1228);
      expect(expected).toBeCloseTo(0.46, 2);
      const events = gameEventsByUser(await tierEvents(db, matchId));
      expect(events.get(a)).toMatchObject({
        resultDelta: 12,
        performanceDelta: 6,
        delta: 18,
        ratingHundredths: 740,
        usualHundredths: 680,
      });
      expect(events.get(b)).toMatchObject({
        resultDelta: 12,
        performanceDelta: -6,
        ratingHundredths: 540,
        usualHundredths: 600,
      });
      const unrated = Math.round(TIER_K * (1 - expected));
      expect(events.get(o)).toMatchObject({
        resultDelta: unrated,
        performanceDelta: 0,
        ratingHundredths: null,
      });

      const results = await db.query.performanceRatingResults.findMany({
        where: eq(performanceRatingResults.matchId, matchId),
      });
      expect(
        results
          .map((row) => [row.userId, row.ratingHundredths, row.ballotsCounted])
          .sort(),
      ).toEqual(
        [
          [a, 740, 4],
          [b, 540, 4],
        ].sort(),
      );
      expect(results.every((row) => row.gameAverageHundredths === 640)).toBe(
        true,
      );
    });
  });

  it("settles on read once the Job is late", async () => {
    await withDb(async (db) => {
      const { f, matchId } = await playedGame(db, { mode: "organizer" });
      const window = await windowOf(db, matchId);
      expect(
        await settleRatingWindowIfDue(
          db,
          matchId,
          new Date(window!.closesAt.getTime() - 1000),
        ),
      ).toBe(false);
      const before = await gameById(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });
      expect(before.ratingWindow).toMatchObject({
        mode: "organizer",
        state: "open",
        viewerMayRate: true,
      });
      expect(await settleRatingWindowIfDue(db, matchId, window!.closesAt)).toBe(
        true,
      );
      expect((await windowOf(db, matchId))?.settledAt).not.toBeNull();
      expect(await tierEvents(db, matchId)).not.toHaveLength(0);
    });
  });

  it("a wrong-score report suspends the window and keeps the ballots; the next completion reopens it", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a } = await playedGame(db, {
        mode: "organizer",
      });
      await rate(db, matchId, [[o, a, 9]]);
      const first = await windowOf(db, matchId);
      await settleRatingWindow(db, matchId, first!.closesAt);
      expect(await tierEvents(db, matchId)).not.toHaveLength(0);
      jobs.clear();

      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId,
        userId: f.organizerId,
      });
      const suspended = await windowOf(db, matchId);
      expect(suspended?.suspendedAt).not.toBeNull();
      expect(suspended?.settledAt).toBeNull();
      expect(jobs.removed).toContain(ratingWindowSettleJobKey(matchId));
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(
        await db.query.performanceRatingResults.findMany({
          where: eq(performanceRatingResults.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.performanceRatings.findMany({
          where: and(
            eq(performanceRatings.matchId, matchId),
            eq(performanceRatings.rateeUserId, a),
          ),
        }),
      ).toHaveLength(1);
      expect(await settleRatingWindow(db, matchId, new Date(9e15))).toBe(false);

      await completeAgain(f, matchId);
      const reopened = await windowOf(db, matchId);
      expect(reopened?.suspendedAt).toBeNull();
      expect(reopened?.settledAt).toBeNull();
      expect(reopened!.closesAt.getTime()).toBeGreaterThanOrEqual(
        first!.closesAt.getTime(),
      );
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(
        jobs.added.some((job) => job.key === ratingWindowSettleJobKey(matchId)),
      ).toBe(true);
    });
  });
});

async function completeAgain(f: FootballFixture, matchId: string) {
  await confirmMatchResult(f.db, {
    gameId: f.gameId,
    matchId,
    userId: f.organizerId,
  });
}
