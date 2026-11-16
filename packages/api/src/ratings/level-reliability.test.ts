import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groups,
  matchRatingWindows,
  notifications,
  performanceRatingResults,
  performanceRatings,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { muFromOvr } from "@repo/domain/football-ovr";
import { notificationCopy } from "@repo/domain/notification-copy";
import { performanceResultView } from "@repo/domain/performance-rating";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { ratingWindowSettleJobKey } from "#src/jobs/specs";
import { applyLevelOverride } from "#src/ratings/apply-level-override";
import {
  addMember,
  closeRatingWindow,
  footballGame,
  playAndSettle,
  playScore,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import { settleRatingWindow } from "#src/ratings/settle-rating-window";
import { gameById } from "#src/routers/games/byId";
import { completeMatch } from "#src/routers/games/completeMatch";
import { performanceRatingResult } from "#src/routers/games/performanceRatingResult";
import { performanceRatingSheet } from "#src/routers/games/performanceRatingSheet";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { submitPerformanceRatings } from "#src/routers/games/submitPerformanceRatings";
import { listNotifications } from "#src/routers/notifications/list";

type ApiDb = Parameters<typeof completeMatch>[0];

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function api(database: TestDatabase) {
  return database as unknown as ApiDb & Parameters<typeof gameById>[0];
}

type PadelMatch = Awaited<ReturnType<typeof setUpMatch>>;

/** a and b beat c and d 6–2 on a Game that counts for Temba Level, and the Organizer completes it. */
async function playedPadel(
  database: TestDatabase,
  existing?: Parameters<typeof setUpMatch>[2],
) {
  const match = await setUpMatch(
    database,
    { rated: true, groupRated: false },
    existing,
  );
  await completeMatch(api(database), {
    gameId: match.gameId,
    matchId: match.matchId,
    userId: match.a.id,
  });
  return match;
}

function again(match: PadelMatch) {
  return {
    players: [match.a, match.b, match.c, match.d] as [
      PadelMatch["a"],
      PadelMatch["b"],
      PadelMatch["c"],
      PadelMatch["d"],
    ],
    groupId: match.groupId,
    venueId: match.venueId,
  };
}

async function rate(
  database: TestDatabase,
  match: PadelMatch,
  rater: { id: string },
  rows: [ratee: { id: string }, value: number][],
  raterRole?: "player" | "level_setter" | "operator",
) {
  await submitPerformanceRatings(api(database), {
    gameId: match.gameId,
    userId: rater.id,
    ratings: rows.map(([ratee, value]) => ({ userId: ratee.id, value })),
    raterRole,
  });
}

async function reliabilityOf(
  database: TestDatabase,
  userId: string,
  sport: "padel" | "football" = "padel",
) {
  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
    columns: { reliability: true },
  });
  return row?.reliability ?? null;
}

async function eventOf(
  database: TestDatabase,
  matchId: string,
  userId: string,
) {
  const event = await database.query.ratingEvents.findFirst({
    where: and(
      eq(ratingEvents.matchId, matchId),
      eq(ratingEvents.userId, userId),
    ),
  });
  if (!event) {
    throw new Error("Expected a rating event");
  }
  return event;
}

describe("a padel Rating window (ADR-0095)", () => {
  const jobs = recordJobs();

  it("opens on a Friendly game that counts for Temba Level on a Group and asks all four to rate", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);

      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, match.matchId),
      });
      expect(window).toMatchObject({
        mode: "everyone",
        countsForLevel: true,
        weightPercent: 0,
        settledAt: null,
      });
      expect(
        jobs.added.some(
          (job) => job.key === ratingWindowSettleJobKey(match.matchId),
        ),
      ).toBe(true);
      // The Level has already moved: the window does not hold it back.
      expect((await eventOf(db, match.matchId, match.a.id)).muAfter).not.toBe(
        (await eventOf(db, match.matchId, match.a.id)).muBefore,
      );

      const asked = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, match.gameId),
          eq(notifications.type, "performance_ratings_open"),
        ),
        columns: { recipientUserId: true },
      });
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [match.a.id, match.b.id, match.c.id, match.d.id].sort(),
      );

      const game = await gameById(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      expect(game.ratingWindow).toMatchObject({
        mode: "everyone",
        state: "open",
        viewerMayRate: true,
        countsForLevel: true,
      });
    });
  });

  it("opens none on a Game with no Group", async () => {
    await withDb(async (db) => {
      const match = await setUpMatch(db, { rated: true, groupRated: false });
      await db.execute(
        `update games set group_id = null where id = '${match.gameId}'`,
      );
      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      expect(
        await db.query.matchRatingWindows.findFirst({
          where: eq(matchRatingWindows.matchId, match.matchId),
        }),
      ).toBeUndefined();
    });
  });

  it("serves the sheet to a player with the Sets as the score", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      const sheet = await performanceRatingSheet(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      expect(sheet).toMatchObject({
        sport: "padel",
        mode: "everyone",
        state: "open",
        viewerSide: 2,
        score: { slot1: 1, slot2: 0 },
        progress: { raters: 0, players: 4 },
      });
      expect(sheet.slot1.map((row) => row.userId).sort()).toEqual(
        [match.a.id, match.b.id].sort(),
      );
    });
  });
});

describe("Reliability (ADR-0095)", () => {
  recordJobs();

  it("drops when two players rate someone low, twice as far while Provisional, and is kept on the result", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await rate(db, match, match.a, [
        [match.c, 3],
        [match.b, 8],
      ]);
      await rate(db, match, match.b, [
        [match.c, 3],
        [match.a, 7],
      ]);
      await rate(db, match, match.d, [[match.a, 7]]);
      await closeRatingWindow(db, match.matchId);

      // A settled 3 takes 10; c is Provisional, so 20.
      expect(await reliabilityOf(db, match.c.id)).toBe(80);
      // Already full, so a good game has nothing to restore.
      expect(await reliabilityOf(db, match.a.id)).toBe(100);
      // One ballot is not enough on padel, which needs two.
      expect(await reliabilityOf(db, match.b.id)).toBe(100);

      const results = await db.query.performanceRatingResults.findMany({
        where: eq(performanceRatingResults.matchId, match.matchId),
      });
      expect(
        results
          .map((row) => [row.userId, row.ratingHundredths])
          .sort((left, right) =>
            String(left[0]).localeCompare(String(right[0])),
          ),
      ).toEqual(
        [
          [match.a.id, 700],
          [match.c.id, 300],
        ].sort((left, right) =>
          String(left[0]).localeCompare(String(right[0])),
        ),
      );
      expect(results.find((row) => row.userId === match.c.id)).toMatchObject({
        reliabilityBefore: 100,
        reliabilityAfter: 80,
      });
    });
  });

  it("moves a confirmed player half as far", async () => {
    await withDb(async (db) => {
      const match = await setUpMatch(db, { rated: true, groupRated: false });
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.a.id,
        setByRole: "operator",
        targetUserId: match.c.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      await rate(db, match, match.a, [[match.c, 3]]);
      await rate(db, match, match.b, [[match.c, 3]]);
      await closeRatingWindow(db, match.matchId);
      expect(await reliabilityOf(db, match.c.id)).toBe(90);
    });
  });

  it("makes the next lost Match cost more, and a won one no different", async () => {
    await withDb(async (db) => {
      const first = await playedPadel(db);
      await db
        .update(ratings)
        .set({ reliability: 60 })
        .where(eq(ratings.userId, first.c.id));
      await db
        .update(ratings)
        .set({ reliability: 60 })
        .where(eq(ratings.userId, first.a.id));

      const second = await playedPadel(db, again(first));
      const lost = await eventOf(db, second.matchId, first.c.id);
      const partner = await eventOf(db, second.matchId, first.d.id);
      const won = await eventOf(db, second.matchId, first.a.id);

      // At 60 a loss costs 20% more.
      expect(lost.reliabilityPart).not.toBeNull();
      const whole = lost.muAfter - lost.muBefore;
      expect(lost.reliabilityPart!).toBeCloseTo(whole / 6, 8);
      expect(whole).toBeLessThan(partner.muAfter - partner.muBefore);
      expect(partner.reliabilityPart).toBeNull();
      expect(won.reliabilityPart).toBeNull();
    });
  });

  it("gives an Operator's or a Level setter's one ballot three times the weight, enough on its own", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await rate(db, match, match.a, [[match.c, 2]], "level_setter");
      await rate(db, match, match.d, [[match.c, 6]]);
      await rate(db, match, match.b, [[match.d, 2]], "operator");
      await closeRatingWindow(db, match.matchId);

      const results = await db.query.performanceRatingResults.findMany({
        where: eq(performanceRatingResults.matchId, match.matchId),
      });
      // (3 × 2 + 6) / 4
      expect(
        results.find((row) => row.userId === match.c.id)?.ratingHundredths,
      ).toBe(300);
      // One ballot, but an Operator's.
      expect(
        results.find((row) => row.userId === match.d.id)?.ratingHundredths,
      ).toBe(200);
      expect(await reliabilityOf(db, match.d.id)).toBe(70);

      const stored = await db.query.performanceRatings.findMany({
        where: eq(performanceRatings.matchId, match.matchId),
        columns: { raterUserId: true, raterRole: true },
      });
      expect(
        stored.find((row) => row.raterUserId === match.a.id)?.raterRole,
      ).toBe("level_setter");
      expect(
        stored.find((row) => row.raterUserId === match.d.id)?.raterRole,
      ).toBe("player");
    });
  });

  it("is given back by a wrong-score report and moved again when the Match completes again", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await rate(db, match, match.a, [[match.c, 3]]);
      await rate(db, match, match.b, [[match.c, 3]]);
      await closeRatingWindow(db, match.matchId);
      expect(await reliabilityOf(db, match.c.id)).toBe(80);

      await reportWrongScore(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      expect(await reliabilityOf(db, match.c.id)).toBe(100);
      expect(
        await db.query.performanceRatingResults.findMany({
          where: eq(performanceRatingResults.matchId, match.matchId),
        }),
      ).toEqual([]);

      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      await closeRatingWindow(db, match.matchId);
      expect(await reliabilityOf(db, match.c.id)).toBe(80);
    });
  });

  it("starts over at 100 when a Level is set by hand", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await db
        .update(ratings)
        .set({ reliability: 40 })
        .where(eq(ratings.userId, match.c.id));
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.a.id,
        setByRole: "operator",
        targetUserId: match.c.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      expect(await reliabilityOf(db, match.c.id)).toBe(100);
    });
  });

  it("stays at 100 through a wrong-score report when a Level was set since", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await db
        .update(ratings)
        .set({ reliability: 50 })
        .where(eq(ratings.userId, match.a.id));
      await rate(db, match, match.c, [[match.a, 8]]);
      await rate(db, match, match.d, [[match.a, 8]]);
      // Settled now, not at the close a day ahead, so the override is later.
      await settleRatingWindow(api(db), match.matchId, new Date(), {
        force: true,
      });
      expect(await reliabilityOf(db, match.a.id)).toBe(60);

      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.b.id,
        setByRole: "operator",
        targetUserId: match.a.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      await reportWrongScore(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      expect(await reliabilityOf(db, match.a.id)).toBe(100);
    });
  });

  it("tells the rated player their rating and Reliability, and shows both on the Game", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await rate(db, match, match.a, [[match.c, 3]]);
      await rate(db, match, match.b, [[match.c, 3]]);
      await closeRatingWindow(db, match.matchId);

      const told = (
        await listNotifications(api(db), { userId: match.c.id })
      ).items.find((item) => item.type === "performance_ratings_closed");
      expect(told?.reliabilityMove).toEqual({
        before: 100,
        after: 80,
        ratingHundredths: 300,
      });
      expect(notificationCopy(told!, "en").subline).toBe(
        "You were rated 3.0. Reliability −20, now 80%.",
      );
      // d was rated by nobody, so there is nothing to tell.
      expect(
        (await listNotifications(api(db), { userId: match.d.id })).items.some(
          (item) => item.type === "performance_ratings_closed",
        ),
      ).toBe(false);

      const result = await performanceRatingResult(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      expect(result).toMatchObject({
        state: "settled",
        sport: "padel",
        countsForLevel: true,
        reliability: {
          ratingHundredths: 300,
          ballotsReceived: 2,
          ballotsNeeded: 2,
          before: 100,
          after: 80,
        },
      });
      const view = performanceResultView(result, "en");
      expect(view).toMatchObject({
        kind: "reliability",
        rating: { value: "3.0" },
        reliability: { value: "80%", delta: "−20" },
      });

      const unrated = await performanceRatingResult(api(db), {
        gameId: match.gameId,
        userId: match.d.id,
      });
      expect(unrated.reliability).toMatchObject({
        ratingHundredths: null,
        ballotsReceived: 0,
        before: 100,
        after: 100,
      });
    });
  });
});

describe("Reliability on football (ADR-0095)", () => {
  recordJobs();

  async function clubGame(db: TestDatabase) {
    const f = await footballGame(db, { verified: true });
    await db
      .update(groups)
      .set({ venueId: f.venueId })
      .where(eq(groups.id, f.groupId));
    return f;
  }

  async function seat(db: TestDatabase, userId: string, reliability: number) {
    await db
      .insert(ratings)
      .values({
        userId,
        sport: "football",
        mu: muFromOvr(76),
        phi: 150,
        sigma: 0.06,
        levelBand: "C1",
        reliability,
      })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.sport],
        set: { mu: muFromOvr(76), phi: 150, reliability },
      });
  }

  it("adds a fifth part to a loser below full Reliability", async () => {
    await withDb(async (db) => {
      const f = await clubGame(db);
      const ids = [];
      for (const name of ["a", "b", "c", "d"]) {
        ids.push(await addMember(f, name));
      }
      const [a, b, c, d] = ids as [string, string, string, string];
      await seat(db, a, 100);
      await seat(db, b, 100);
      await seat(db, c, 0);
      await seat(db, d, 100);
      const matchId = await playAndSettle(f, [a, b], [c, d], {
        slot1: 2,
        slot2: 0,
      });

      const low = await eventOf(db, matchId, c);
      const full = await eventOf(db, matchId, d);
      expect(low.resultPart!).toBeCloseTo(full.resultPart!, 8);
      expect(low.reliabilityPart!).toBeCloseTo(low.resultPart! / 2, 8);
      expect(full.reliabilityPart).toBeNull();
      expect(low.muAfter).toBeLessThan(full.muAfter);
    });
  });

  it("moves Reliability when the window settles, after the OVR move", async () => {
    await withDb(async (db) => {
      const f = await clubGame(db);
      const ids = [];
      for (const name of ["a", "b", "c", "d", "e", "g"]) {
        ids.push(await addMember(f, name));
      }
      const [a, b, c, d, e, g] = ids as [
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      for (const id of ids) {
        await seat(db, id, 100);
      }
      const matchId = await playScore(f, [a, b, c], [d, e, g], {
        slot1: 1,
        slot2: 0,
      });
      await db.insert(performanceRatings).values(
        [a, b, c].map((raterUserId) => ({
          matchId,
          raterUserId,
          rateeUserId: d,
          value: 1,
        })),
      );
      await closeRatingWindow(db, matchId);

      // A settled 1 takes 20, and 40 while Provisional: this is d's first
      // counting Match.
      expect(await reliabilityOf(db, d, "football")).toBe(60);
      // This Match was lost at full Reliability: the step counts from the next.
      expect((await eventOf(db, matchId, d)).reliabilityPart).toBeNull();
    });
  });
});
