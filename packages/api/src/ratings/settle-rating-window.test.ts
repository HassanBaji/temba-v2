import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupTierEvents,
  groupTierPoints,
  matchRatingWindows,
  matches,
  notifications,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { TIER_K, tierExpectedScore } from "@repo/domain/tier-points";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { ratingWindowSettleJobKey, settleMvpJobKey } from "#src/jobs/specs";
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
import { performanceRatingResult } from "#src/routers/games/performanceRatingResult";
import { submitPerformanceRatings } from "#src/routers/games/submitPerformanceRatings";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { forGame } from "#src/routers/marks/forGame";
import { setMvp } from "#src/routers/marks/setMvp";
import { setMvpMode } from "#src/routers/marks/setMvpMode";

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

  it("when everyone rates, asks every seated account holder and not an Organizer who did not play", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone" });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      await playScore(f, [a, b], [c], { slot1: 2, slot2: 0 });
      const sent = await db.query.notifications.findMany({
        where: eq(notifications.type, "performance_ratings_open"),
      });
      expect(
        sent.map((row) => [row.recipientUserId, row.audience]).sort(),
      ).toEqual(
        [
          [a, "player"],
          [b, "player"],
          [c, "player"],
        ].sort(),
      );
      expect(sent.every((row) => row.gameId === f.gameId)).toBe(true);
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

describe("The MVP closes with the Match's Rating window (ADR-0068)", () => {
  const jobs = recordJobs();
  const HOUR = 60 * 60 * 1000;

  async function mvpOf(database: TestDatabase, gameId: string) {
    return database.query.games.findFirst({
      where: eq(games.id, gameId),
      columns: {
        mvpUserId: true,
        mvpDecidedBy: true,
        mvpSettledAt: true,
      },
    });
  }

  function mvpJobRunAts(gameId: string) {
    return jobs.added
      .filter((job) => job.key === settleMvpJobKey(gameId))
      .map((job) => job.runAt);
  }

  it("closes a tier Match's vote at 24 hours and settles it with the window", async () => {
    await withDb(async (db) => {
      const { f, matchId, a, b, c } = await playedGame(db, {
        mode: "everyone",
      });
      const window = await windowOf(db, matchId);
      expect(mvpJobRunAts(f.gameId)).toEqual([window!.closesAt]);
      const marks = await forGame(db, { gameId: f.gameId, userId: a });
      expect(marks.mvp).toMatchObject({
        state: "pending",
        closesAt: window!.closesAt,
      });

      await castMvpVote(
        db,
        { gameId: f.gameId, userId: a, candidateUserId: c },
        new Date(window!.closesAt.getTime() - HOUR),
      );
      await expect(
        castMvpVote(
          db,
          { gameId: f.gameId, userId: b, candidateUserId: c },
          new Date(window!.closesAt.getTime() + HOUR),
        ),
      ).rejects.toThrow();

      expect(await settleRatingWindow(db, matchId, window!.closesAt)).toBe(
        true,
      );
      expect(await mvpOf(db, f.gameId)).toEqual({
        mvpUserId: c,
        mvpDecidedBy: "vote",
        mvpSettledAt: window!.closesAt,
      });
      const shown = await performanceRatingResult(
        db,
        { gameId: f.gameId, userId: a },
        new Date(window!.closesAt.getTime() + HOUR),
      );
      expect(shown.result?.mvp).toMatchObject({
        decidedBy: "vote",
        isViewer: false,
      });
    });
  });

  it("closes the MVP when the rating Organizer submits", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "organizer" });
      await setMvpMode(db, {
        gameId: f.gameId,
        userId: f.organizerId,
        mode: "organizer",
      });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 2, slot2: 1 });
      const window = await windowOf(db, matchId);
      const submittedAt = new Date(window!.closesAt.getTime() - 20 * HOUR);

      await setMvp(
        db,
        { gameId: f.gameId, userId: f.organizerId, mvpUserId: a },
        submittedAt,
      );
      expect((await mvpOf(db, f.gameId))?.mvpSettledAt).toBeNull();
      await submitPerformanceRatings(
        db,
        {
          gameId: f.gameId,
          userId: f.organizerId,
          ratings: [
            { userId: a, value: 8 },
            { userId: b, value: 6 },
          ],
        },
        submittedAt,
      );

      expect(await mvpOf(db, f.gameId)).toEqual({
        mvpUserId: a,
        mvpDecidedBy: "organizer",
        mvpSettledAt: submittedAt,
      });
      await expect(
        setMvp(
          db,
          { gameId: f.gameId, userId: f.organizerId, mvpUserId: b },
          new Date(submittedAt.getTime() + HOUR),
        ),
      ).rejects.toThrow();
    });
  });

  it("keeps 48 hours on a tier Match with no Rating window", async () => {
    await withDb(async (db) => {
      const { f, matchId } = await playedGame(db, { mode: "off" });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(mvpJobRunAts(f.gameId)).toEqual([
        new Date(match!.completedAt!.getTime() + 48 * HOUR),
      ]);
    });
  });
});
