import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { Db } from "@repo/db";
import { matchRatingWindows } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import {
  addMember,
  footballGame,
  playScore,
  setRatingSettings,
  tierEvents,
} from "#src/ratings/group-rated-match.test-support";

import { handle, jobName, payloadSchema } from "./rating-window.settle";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function asDb(database: TestDatabase): Db {
  return database as unknown as Db;
}

describe("rating-window.settle", () => {
  recordJobs();

  it("is named for the Rating window and takes a Match id", () => {
    expect(jobName).toBe("rating-window.settle");
    expect(payloadSchema.safeParse({ matchId: "nope" }).success).toBe(false);
  });

  it("settles the window at its close and is a no-op before and after", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await setRatingSettings(f, { mode: "organizer" });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 2, slot2: 0 });
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });

      await handle(
        asDb(db),
        { matchId },
        undefined,
        new Date(window!.closesAt.getTime() - 1000),
      );
      expect(await tierEvents(db, matchId)).toHaveLength(0);

      await handle(asDb(db), { matchId }, undefined, window!.closesAt);
      const events = await tierEvents(db, matchId);
      expect(events.filter((event) => event.kind === "game")).toHaveLength(2);

      await handle(asDb(db), { matchId }, undefined, window!.closesAt);
      expect(await tierEvents(db, matchId)).toHaveLength(events.length);
    });
  });
});
