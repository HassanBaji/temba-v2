import { describe, expect, it } from "vitest";

import type { Db } from "@repo/db";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { handle as settleMvpJob } from "#src/jobs/handlers/marks.settle-mvp";
import {
  completePadelMatch,
  gameMvpColumns,
  marksClosesAt,
  notificationsOf,
  recordJobs,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { forGame } from "#src/routers/marks/forGame";
import { setMvp } from "#src/routers/marks/setMvp";
import { setMvpMode } from "#src/routers/marks/setMvpMode";

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

async function organizerPicksGame(db: TestDatabase) {
  const game = await seatPadelFriendlyGame(db);
  await setMvpMode(db, {
    gameId: game.gameId,
    userId: game.organizer.id,
    mode: "organizer",
  });
  await completePadelMatch(db, game);
  return game;
}

function pick(
  db: TestDatabase,
  game: PadelMarksGame,
  userId: string,
  mvpUserId: string,
  now?: Date,
) {
  return setMvp(db, { gameId: game.gameId, userId, mvpUserId }, now);
}

describe("marks.setMvp", () => {
  const jobs = recordJobs();

  it("lets the Organizer pick and change until the close, then settles once", async () => {
    await withDb(async (db) => {
      const game = await organizerPicksGame(db);
      const closesAt = await marksClosesAt(db, game.matchId);

      await pick(db, game, game.organizer.id, game.a.id);
      await pick(db, game, game.organizer.id, game.d.id);
      await pick(db, game, game.organizer.id, game.c.id);

      const view = await forGame(db, {
        gameId: game.gameId,
        userId: game.b.id,
      });
      expect(view.mvp).toMatchObject({
        mode: "organizer",
        state: "decided",
        userId: game.c.id,
        decidedBy: "organizer",
        settledAt: null,
        closesAt,
      });
      expect(view.mvp.decidedAt).toBeInstanceOf(Date);
      expect(view.viewer).toMatchObject({ canVote: false, canPickMvp: false });
      expect(
        (
          await forGame(db, {
            gameId: game.gameId,
            userId: game.organizer.id,
          })
        ).viewer,
      ).toMatchObject({ isOrganizer: true, canPickMvp: true });
      expect(await notificationsOf(db, game.gameId, "mvp_decided")).toEqual([]);

      await settleMvpJob(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        new Date(closesAt.getTime() - 1),
      );
      expect((await gameMvpColumns(db, game.gameId)).mvpSettledAt).toBeNull();

      await settleMvpJob(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        closesAt,
      );
      const columns = await gameMvpColumns(db, game.gameId);
      expect(columns).toMatchObject({
        mvpUserId: game.c.id,
        mvpDecidedBy: "organizer",
        mvpSettledAt: closesAt,
      });
      const decided = await notificationsOf(db, game.gameId, "mvp_decided");
      expect(decided).toHaveLength(4);

      await settleMvpJob(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        new Date(closesAt.getTime() + 60_000),
      );
      expect(await gameMvpColumns(db, game.gameId)).toEqual(columns);
      expect(
        await notificationsOf(db, game.gameId, "mvp_decided"),
      ).toHaveLength(4);
      expect(jobs.removed).toEqual([]);
    });
  });

  it("refuses the Organizer's own name, a non-participant, a non-organizer, and after the close", async () => {
    await withDb(async (db) => {
      const game = await organizerPicksGame(db);
      await expect(
        pick(db, game, game.organizer.id, game.organizer.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "self" });
      await expect(
        pick(db, game, game.organizer.id, game.outsider.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_candidate" });
      await expect(pick(db, game, game.a.id, game.c.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "not_organizer",
      });
      const closesAt = await marksClosesAt(db, game.matchId);
      await expect(
        pick(db, game, game.organizer.id, game.c.id, closesAt),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "closed" });
    });
  });

  it("settles with no MVP when the Organizer never picks", async () => {
    await withDb(async (db) => {
      const game = await organizerPicksGame(db);
      const closesAt = await marksClosesAt(db, game.matchId);
      await settleMvpJob(
        asDb(db),
        { gameId: game.gameId },
        undefined,
        closesAt,
      );
      expect(await gameMvpColumns(db, game.gameId)).toMatchObject({
        mvpUserId: null,
        mvpDecidedBy: null,
        mvpSettledAt: closesAt,
      });
      expect(await notificationsOf(db, game.gameId, "mvp_decided")).toEqual([]);
      const view = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(view.mvp).toMatchObject({ state: "none", userId: null });
    });
  });

  it("refuses a pick in vote mode unless the vote tied, and in none mode", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.a.id,
        candidateUserId: game.c.id,
      });
      await expect(
        pick(db, game, game.organizer.id, game.c.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "wrong_mode" });

      const none = await seatPadelFriendlyGame(db);
      await setMvpMode(db, {
        gameId: none.gameId,
        userId: none.organizer.id,
        mode: "none",
      });
      await completePadelMatch(db, none);
      await expect(
        pick(db, none, none.organizer.id, none.c.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "wrong_mode" });
    });
  });
});
