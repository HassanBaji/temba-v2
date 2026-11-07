import { describe, expect, it } from "vitest";

import type { Db } from "@repo/db";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  completePadelMatch,
  gameMvpColumns,
  marksClosesAt,
  notificationsOf,
  recordJobs,
  seatPadelFriendlyGame,
} from "#src/marks/marks.test-support";
import { castMvpVote } from "#src/routers/marks/castMvpVote";

import { handle, jobName, payloadSchema } from "./marks.settle-mvp";

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

describe("marks.settle-mvp", () => {
  const jobs = recordJobs();

  it("is named for the Marks domain and takes a Game id", () => {
    expect(jobName).toBe("marks.settle-mvp");
    expect(payloadSchema.safeParse({ gameId: "nope" }).success).toBe(false);
  });

  it("settles the vote at the close, notifies once, and is a no-op after", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.a.id,
        candidateUserId: game.c.id,
      });
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.b.id,
        candidateUserId: game.c.id,
      });
      const closesAt = await marksClosesAt(db, game.matchId);
      jobs.clear();

      await handle(asDb(db), { gameId: game.gameId }, undefined, closesAt);
      const settled = await gameMvpColumns(db, game.gameId);
      expect(settled).toMatchObject({
        mvpUserId: game.c.id,
        mvpDecidedBy: "vote",
        mvpDecidedAt: closesAt,
        mvpSettledAt: closesAt,
      });
      expect(
        await notificationsOf(db, game.gameId, "mvp_decided"),
      ).toHaveLength(4);
      expect(jobs.added.map((job) => job.name)).toEqual(
        Array<string>(4).fill("notification.email"),
      );
      jobs.clear();

      await handle(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        new Date(closesAt.getTime() + 60_000),
      );
      expect(await gameMvpColumns(db, game.gameId)).toEqual(settled);
      expect(
        await notificationsOf(db, game.gameId, "mvp_decided"),
      ).toHaveLength(4);
      expect(jobs.added).toEqual([]);
      expect(jobs.removed).toEqual([]);
    });
  });

  it("leaves a Game alone before its close, and an unknown Game", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      const closesAt = await marksClosesAt(db, game.matchId);
      await handle(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        new Date(closesAt.getTime() - 1),
      );
      expect((await gameMvpColumns(db, game.gameId)).mvpSettledAt).toBeNull();
      await expect(
        handle(asDb(db), { gameId: crypto.randomUUID() }, undefined, closesAt),
      ).resolves.toBeUndefined();
    });
  });
});
