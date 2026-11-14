import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  matchRatingWindows,
  performanceRatingResults,
  performanceRatings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import {
  addMember,
  footballGame,
  nextFootballGame,
  playScore,
  registerOrganizer,
  setRatingSettings,
  tierEvents,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { settleRatingWindow } from "#src/ratings/settle-rating-window";
import { register } from "#src/routers/games/register";

import { performanceRatingSummary } from "./performanceRatingSummary";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function settle(database: TestDatabase, matchId: string) {
  const window = await database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
  });
  expect(await settleRatingWindow(database, matchId, window!.closesAt)).toBe(
    true,
  );
}

async function ratingOf(
  database: TestDatabase,
  matchId: string,
  userId: string,
) {
  const rows = await database.query.performanceRatingResults.findMany({
    where: eq(performanceRatingResults.matchId, matchId),
  });
  return rows.find((row) => row.userId === userId)?.ratingHundredths ?? null;
}

async function caught(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected a TRPCError");
}

/**
 * The Organizer, a and b play c, d and x, everyone rates. a, b, c and d give
 * everyone else 6, 7, 8 and 7; x gives everyone a 1.
 */
async function ratedGame(
  f: FootballFixture,
  players: { o: string; a: string; b: string; c: string; d: string; x: string },
) {
  const { o, a, b, c, d, x } = players;
  const matchId = await playScore(f, [o, a, b], [c, d, x], {
    slot1: 5,
    slot2: 3,
  });
  const everyone = [o, a, b, c, d, x];
  const values: [string, number][] = [
    [a, 6],
    [b, 7],
    [c, 8],
    [d, 7],
    [x, 1],
  ];
  await f.db
    .insert(performanceRatings)
    .values(
      values.flatMap(([raterUserId, value]) =>
        everyone
          .filter((rateeUserId) => rateeUserId !== raterUserId)
          .map((rateeUserId) => ({ matchId, raterUserId, rateeUserId, value })),
      ),
    );
  await settle(f.db, matchId);
  return matchId;
}

async function threeGamesRunning(database: TestDatabase) {
  const first = await footballGame(database);
  await setRatingSettings(first, { mode: "everyone", weightPercent: 30 });
  const o = await registerOrganizer(first);
  const players = {
    o,
    a: await addMember(first, "Ali M"),
    b: await addMember(first, "Bo Fareed"),
    c: await addMember(first, "Jassim H"),
    d: await addMember(first, "Salman R"),
    x: await addMember(first, "Yousif K"),
  };
  const matches = [await ratedGame(first, players)];
  let latest = first;
  for (const startsInHours of [30, 60]) {
    latest = await nextFootballGame(first, startsInHours);
    for (const userId of Object.values(players)) {
      await register(database, { gameId: latest.gameId, userId });
    }
    matches.push(await ratedGame(latest, players));
  }
  return { f: latest, players, matches };
}

describe("games.performanceRatingSummary (screen 4d)", () => {
  recordJobs();

  it("a rater who gave 1s where everyone else gave 6 to 8, three games running, has weight 0.5 in the third", async () => {
    await withDb(async (db) => {
      const { f, players, matches } = await threeGamesRunning(db);
      const [first, second, third] = matches;

      // a gets 7, 8, 7 and x's 1: 23 / 4 at full weight.
      expect(await ratingOf(db, first!, players.a)).toBe(575);
      expect(await ratingOf(db, second!, players.a)).toBe(575);
      // (7 + 8 + 7 + 0.5 × 1) / 3.5
      expect(await ratingOf(db, third!, players.a)).toBe(643);

      const summary = await performanceRatingSummary(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });
      expect(summary.summary?.ratersCountedForLess).toBe(1);
    });
  });

  it("says how many raters counted for less, never which, with each player's rating and points move", async () => {
    await withDb(async (db) => {
      const { f, players, matches } = await threeGamesRunning(db);
      const data = await performanceRatingSummary(db, {
        gameId: f.gameId,
        userId: f.organizerId,
      });

      expect(data.state).toBe("settled");
      const summary = data.summary!;
      expect(summary).toMatchObject({
        groupId: f.groupId,
        groupName: "Thursday Football",
        score: { slot1: 5, slot2: 3 },
        bibs: { slot1: "black", slot2: "white" },
        viewerSide: 1,
        progress: { raters: 5, players: 6 },
        ratersCountedForLess: 1,
      });
      const events = new Map(
        (await tierEvents(db, matches[2]!))
          .filter((event) => event.kind === "game")
          .map((event) => [event.userId, event]),
      );
      const ali = summary.slot1.find((row) => row.name === "Ali M");
      expect(ali).toEqual({
        name: "Ali M",
        isViewer: false,
        ratingHundredths: 643,
        ballotsReceived: 4,
        delta: events.get(players.a)!.delta,
        bandBefore: events.get(players.a)!.bandBefore,
        bandAfter: events.get(players.a)!.bandAfter,
        isMvp: false,
      });
      expect(summary.slot1.find((row) => row.isViewer)?.name).toBe("organizer");

      const sent = JSON.stringify(data);
      for (const userId of Object.values(players)) {
        expect(sent).not.toContain(userId);
      }
    });
  });

  it("refuses a member who is not an Organizer", async () => {
    await withDb(async (db) => {
      const { f, players } = await threeGamesRunning(db);
      const member = await caught(
        performanceRatingSummary(db, { gameId: f.gameId, userId: players.a }),
      );
      expect(member.code).toBe("FORBIDDEN");
    });
  });

  it("before the window settles, returns the closing time and no summary", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "everyone" });
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      const c = await addMember(f, "c");
      const matchId = await playScore(f, [o, a], [c], { slot1: 1, slot2: 0 });
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });

      expect(
        await performanceRatingSummary(
          db,
          { gameId: f.gameId, userId: o },
          new Date(window!.closesAt.getTime() - 60_000),
        ),
      ).toEqual({
        state: "open",
        mode: "everyone",
        closesAt: window!.closesAt,
        summary: null,
      });
    });
  });
});
