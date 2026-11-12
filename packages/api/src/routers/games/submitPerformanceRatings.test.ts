import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { matchRatingWindows, performanceRatings } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  TIER_K_PROVISIONAL,
  tierExpectedScore,
} from "@repo/domain/tier-points";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { ratingWindowSettleJobKey } from "#src/jobs/specs";
import {
  addMember,
  footballGame,
  insertUser,
  playScore,
  registerOrganizer,
  setRatingSettings,
  tierEvents,
} from "#src/ratings/group-rated-match.test-support";

import { submitPerformanceRatings } from "./submitPerformanceRatings";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

/** The Organizer, a and b beat c and d 3–1 with the Organizer rating. */
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

async function refusal(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("games.submitPerformanceRatings in Organizer mode (ADR-0068)", () => {
  const jobs = recordJobs();

  it("closes the window on submit and moves everyone's points at once", async () => {
    await withDb(async (db) => {
      const { f, matchId, o, a, b, c, d } = await organizerRatedGame(db);
      expect(await tierEvents(db, matchId)).toHaveLength(0);

      const result = await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [
          { userId: a, value: 9 },
          { userId: b, value: 5 },
          { userId: c, value: 7 },
        ],
      });
      expect(result).toEqual({ ok: true, settled: true });
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });
      expect(window?.settledAt).not.toBeNull();
      expect(jobs.removed).toContain(ratingWindowSettleJobKey(matchId));

      const events = new Map(
        (await tierEvents(db, matchId))
          .filter((event) => event.kind === "game")
          .map((event) => [event.userId, event]),
      );
      expect(events.size).toBe(5);
      const winStep = Math.round(
        TIER_K_PROVISIONAL * (1 - tierExpectedScore(1200, 1200)),
      );
      expect(events.get(o)).toMatchObject({
        performanceDelta: 0,
        resultDelta: winStep,
        ratingHundredths: null,
      });
      expect(events.get(d)).toMatchObject({
        performanceDelta: 0,
        resultDelta: -winStep,
        ratingHundredths: null,
      });
      expect(events.get(a)!.ratingHundredths).toBe(900);
      expect(events.get(a)!.performanceDelta).toBeGreaterThan(0);
      expect(events.get(b)!.performanceDelta).toBeLessThan(0);
      expect(events.get(a)!.resultDelta).toBeLessThan(winStep);
    });
  });

  it("refuses a rating of 0 or 11, and a rating of yourself", async () => {
    await withDb(async (db) => {
      const { f, o, a } = await organizerRatedGame(db);
      for (const value of [0, 11, 6.5]) {
        const error = await refusal(
          submitPerformanceRatings(db, {
            gameId: f.gameId,
            userId: o,
            ratings: [{ userId: a, value }],
          }),
        );
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toBe("A rating is a whole number from 1 to 10.");
      }
      const self = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: o,
          ratings: [{ userId: o, value: 7 }],
        }),
      );
      expect(self.code).toBe("BAD_REQUEST");
      expect(self.message).toBe("You can’t rate yourself.");
      expect(await db.query.performanceRatings.findMany()).toHaveLength(0);
    });
  });

  it("lets only an Organizer of the Game rate, and only the players of the Match", async () => {
    await withDb(async (db) => {
      const { f, a, b } = await organizerRatedGame(db);
      const player = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: a,
          ratings: [{ userId: b, value: 7 }],
        }),
      );
      expect(player.code).toBe("FORBIDDEN");

      const stranger = await insertUser(db, "stranger");
      const notPlaying = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: f.organizerId,
          ratings: [{ userId: stranger.id, value: 7 }],
        }),
      );
      expect(notPlaying.code).toBe("BAD_REQUEST");
    });
  });

  it("refuses once the window has closed", async () => {
    await withDb(async (db) => {
      const { f, o, a } = await organizerRatedGame(db);
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [],
      });
      const closed = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: o,
          ratings: [{ userId: a, value: 8 }],
        }),
      );
      expect(closed.code).toBe("CONFLICT");
      expect(await db.query.performanceRatings.findMany()).toHaveLength(0);
    });
  });

  it("refuses a Game whose Match has no window", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      await playScore(f, [o], [a], { slot1: 1, slot2: 0 });
      const error = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: o,
          ratings: [{ userId: a, value: 7 }],
        }),
      );
      expect(error.code).toBe("PRECONDITION_FAILED");
    });
  });
});

describe("games.submitPerformanceRatings when everyone rates", () => {
  recordJobs();

  it("keeps the window open and replaces the rater's ballot set", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone" });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const matchId = await playScore(f, [a, b], [c], { slot1: 1, slot2: 0 });

      const first = await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: a,
        ratings: [
          { userId: b, value: 7 },
          { userId: c, value: 6 },
        ],
      });
      expect(first).toEqual({ ok: true, settled: false });
      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: a,
        ratings: [{ userId: b, value: 8 }],
      });
      const ballots = await db.query.performanceRatings.findMany({
        where: eq(performanceRatings.matchId, matchId),
      });
      expect(ballots.map((row) => [row.rateeUserId, row.value])).toEqual([
        [b, 8],
      ]);
      expect(await tierEvents(db, matchId)).toHaveLength(0);

      const outsider = await refusal(
        submitPerformanceRatings(db, {
          gameId: f.gameId,
          userId: f.organizerId,
          ratings: [{ userId: b, value: 8 }],
        }),
      );
      expect(outsider.code).toBe("FORBIDDEN");
    });
  });
});
