import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { Db } from "@repo/db";
import {
  MatchStatusEnum,
  matches,
  matchResultConfirmations,
  ratingEvents,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { PUBLIC_GAME_CONFIRM_WINDOW_MS } from "#src/games/match-result-confirmations";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmWindowJobKey } from "#src/jobs/specs";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { seatedPublicGame } from "#src/routers/games/public-game.test-support";
import { scoreSet } from "#src/routers/games/scoreSet";

import { handle, jobName, payloadSchema } from "./match.confirm-window";

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

async function enteredPublicGame(db: TestDatabase) {
  const g = await seatedPublicGame(db);
  await scoreSet(db, {
    gameId: g.gameId,
    matchId: g.matchId,
    setId: g.setId,
    userId: g.creator,
    slot1GamesWon: 6,
    slot2GamesWon: 3,
  });
  const [row] = await db
    .select({ confirmedAt: matchResultConfirmations.confirmedAt })
    .from(matchResultConfirmations)
    .where(eq(matchResultConfirmations.matchId, g.matchId));
  return {
    ...g,
    closesAt: new Date(
      row!.confirmedAt.getTime() + PUBLIC_GAME_CONFIRM_WINDOW_MS,
    ),
  };
}

describe("match.confirm-window", () => {
  const jobs = recordJobs();

  it("is named for the confirm window and takes a Match id", () => {
    expect(jobName).toBe("match.confirm-window");
    expect(payloadSchema.safeParse({ matchId: "nope" }).success).toBe(false);
  });

  it("completes an unconfirmed score after 24 hours, in Match history, with no rating event", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      await handle(asDb(db), { matchId: g.matchId }, undefined, g.closesAt);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);

      const later = new Date(g.closesAt.getTime() + 60_000);
      const history = await listMyMatchHistoryRows(db, g.c, later);
      expect(history.map((row) => row.matchId)).toContain(g.matchId);

      await handle(asDb(db), { matchId: g.matchId }, undefined, later);
      const again = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(again?.stoodUnconfirmedAt).toEqual(match?.stoodUnconfirmedAt);
    });
  });

  it("moves itself to the window's close when it wakes early", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      jobs.clear();
      await handle(
        asDb(db),
        { matchId: g.matchId },
        undefined,
        new Date(g.closesAt.getTime() - 1000),
      );

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
      expect(jobs.added).toHaveLength(1);
      expect(jobs.added[0]).toMatchObject({
        key: confirmWindowJobKey(g.matchId),
        runAt: g.closesAt,
      });
    });
  });
});
