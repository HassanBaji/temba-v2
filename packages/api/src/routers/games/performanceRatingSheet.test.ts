import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, performanceRatings } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import {
  addMember,
  footballGame,
  playScore,
  registerOrganizer,
  setRatingSettings,
} from "#src/ratings/group-rated-match.test-support";

import { performanceRatingSheet } from "./performanceRatingSheet";
import { submitPerformanceRatings } from "./submitPerformanceRatings";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function refusal(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("games.performanceRatingSheet (screen 4a)", () => {
  recordJobs();

  it("gives an Organizer both sides, their own ballots only and the MVP star", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "organizer", weightPercent: 20 });
      await db
        .update(games)
        .set({ mvpMode: "organizer" })
        .where(eq(games.id, f.gameId));
      const o = await registerOrganizer(f);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [o, a], [b], { slot1: 5, slot2: 3 });
      await db.insert(performanceRatings).values({
        matchId,
        raterUserId: a,
        rateeUserId: b,
        value: 4,
      });

      const sheet = await performanceRatingSheet(db, {
        gameId: f.gameId,
        userId: o,
      });
      expect(sheet).toMatchObject({
        matchId,
        mode: "organizer",
        weightPercent: 20,
        state: "open",
        groupName: "Thursday Football",
        score: { slot1: 5, slot2: 3 },
        bibs: { slot1: "black", slot2: "white" },
        viewerSide: 1,
        viewerIsOrganizer: true,
        ratings: [],
        mvp: { pickable: true, userId: null },
      });
      expect(sheet.slot1.map((row) => [row.userId, row.isViewer])).toEqual(
        expect.arrayContaining([
          [o, true],
          [a, false],
        ]),
      );
      expect(sheet.slot2.map((row) => row.userId)).toEqual([b]);

      await submitPerformanceRatings(db, {
        gameId: f.gameId,
        userId: o,
        ratings: [{ userId: a, value: 8 }],
      });
      const closed = await performanceRatingSheet(db, {
        gameId: f.gameId,
        userId: o,
      });
      expect(closed.state).toBe("settled");
      expect(closed.ratings).toEqual([{ userId: a, value: 8 }]);
    });
  });

  it("is for an Organizer only in Organizer mode, and needs a window", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      const none = await refusal(
        performanceRatingSheet(db, { gameId: f.gameId, userId: f.organizerId }),
      );
      expect(none.code).toBe("PRECONDITION_FAILED");

      const g = await footballGame(db);
      await setRatingSettings(g, { mode: "organizer" });
      const c = await addMember(g, "c");
      const d = await addMember(g, "d");
      await playScore(g, [c], [d], { slot1: 1, slot2: 0 });
      const player = await refusal(
        performanceRatingSheet(db, { gameId: g.gameId, userId: c }),
      );
      expect(player.code).toBe("FORBIDDEN");
      const sheet = await performanceRatingSheet(db, {
        gameId: g.gameId,
        userId: g.organizerId,
      });
      expect(sheet.viewerSide).toBeNull();
      expect(sheet.mvp.pickable).toBe(false);
    });
  });
});
