import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  matchRatingWindows,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db/schema";
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
import { settleRatingWindow } from "#src/ratings/settle-rating-window";

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

describe("games.submitPerformanceRatings when everyone rates: settling (ADR-0068)", () => {
  recordJobs();

  async function rateAs(
    database: TestDatabase,
    gameId: string,
    raterUserId: string,
    ratings: [ratee: string, value: number][],
  ) {
    await submitPerformanceRatings(database, {
      gameId,
      userId: raterUserId,
      ratings: ratings.map(([userId, value]) => ({ userId, value })),
    });
  }

  async function settle(database: TestDatabase, matchId: string) {
    const window = await database.query.matchRatingWindows.findFirst({
      where: eq(matchRatingWindows.matchId, matchId),
    });
    expect(await settleRatingWindow(database, matchId, window!.closesAt)).toBe(
      true,
    );
  }

  async function settledRatings(database: TestDatabase, matchId: string) {
    const rows = await database.query.performanceRatingResults.findMany({
      where: eq(performanceRatingResults.matchId, matchId),
    });
    return new Map(rows.map((row) => [row.userId, row]));
  }

  it("gives two ballots no performance part, and drops the highest and lowest of five", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone", weightPercent: 30 });
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const d = await addMember(f, "d");
      const e = await addMember(f, "e");
      const g = await addMember(f, "g");
      const matchId = await playScore(f, [o, a, b, g], [c, d, e], {
        slot1: 2,
        slot2: 1,
      });

      await rateAs(db, f.gameId, b, [
        [a, 9],
        [d, 7],
      ]);
      await rateAs(db, f.gameId, c, [
        [a, 9],
        [d, 8],
      ]);
      await rateAs(db, f.gameId, o, [[d, 2]]);
      await rateAs(db, f.gameId, a, [[d, 6]]);
      await rateAs(db, f.gameId, e, [[d, 10]]);
      await settle(db, matchId);

      const results = await settledRatings(db, matchId);
      expect(results.has(a)).toBe(false);
      expect(results.get(d)).toMatchObject({
        ratingHundredths: 700,
        ballotsCounted: 3,
      });
      const events = new Map(
        (await tierEvents(db, matchId)).map((event) => [event.userId, event]),
      );
      expect(events.get(a)).toMatchObject({
        ratingHundredths: null,
        performanceDelta: 0,
      });
      expect(events.get(d)!.ratingHundredths).toBe(700);
    });
  });

  it("an Organizer's 9 among 6, 6 and 7 counts for more with the double setting on", async () => {
    await withDb(async (db) => {
      const settledFor = async (organizerCountsDouble: boolean) => {
        const f = await footballGame(db);
        await setRatingSettings(f, { mode: "everyone", organizerCountsDouble });
        const o = await registerOrganizer(f);
        const a = await addMember(f, "a");
        const b = await addMember(f, "b");
        const c = await addMember(f, "c");
        const d = await addMember(f, "d");
        const matchId = await playScore(f, [o, a, b], [c, d], {
          slot1: 1,
          slot2: 1,
        });
        await rateAs(db, f.gameId, o, [[d, 9]]);
        await rateAs(db, f.gameId, a, [[d, 6]]);
        await rateAs(db, f.gameId, b, [[d, 6]]);
        await rateAs(db, f.gameId, c, [[d, 7]]);
        await settle(db, matchId);
        return (await settledRatings(db, matchId)).get(d)!.ratingHundredths;
      };

      const off = await settledFor(false);
      const on = await settledFor(true);
      expect(off).toBe(700);
      expect(on).toBe(740);
      expect(on).toBeGreaterThan(off);
    });
  });

  it("does not count a blank as a ballot", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone" });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const d = await addMember(f, "d");
      const matchId = await playScore(f, [a, b], [c, d], {
        slot1: 1,
        slot2: 0,
      });
      await rateAs(db, f.gameId, a, [
        [d, 8],
        [b, 7],
      ]);
      await rateAs(db, f.gameId, b, [[d, 6]]);
      await rateAs(db, f.gameId, c, [[d, 7]]);
      await rateAs(db, f.gameId, a, [[b, 7]]);

      const toD = await db.query.performanceRatings.findMany({
        where: eq(performanceRatings.rateeUserId, d),
      });
      expect(toD.map((row) => row.raterUserId).sort()).toEqual([b, c].sort());
      await settle(db, matchId);
      expect((await settledRatings(db, matchId)).has(d)).toBe(false);
    });
  });

  it("lets a player change their ratings until the window closes, then refuses", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone" });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      await rateAs(db, f.gameId, a, [[b, 6]]);
      await rateAs(db, f.gameId, a, [[b, 8]]);
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });
      const closed = await refusal(
        submitPerformanceRatings(
          db,
          { gameId: f.gameId, userId: a, ratings: [{ userId: b, value: 9 }] },
          window!.closesAt,
        ),
      );
      expect(closed.code).toBe("CONFLICT");
      const ballots = await db.query.performanceRatings.findMany({
        where: eq(performanceRatings.matchId, matchId),
      });
      expect(ballots.map((row) => row.value)).toEqual([8]);
    });
  });
});
