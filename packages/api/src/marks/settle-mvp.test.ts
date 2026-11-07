import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { gameMvpVotes, matchSets } from "@repo/db/schema";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { JOB, settleMvpJobKey } from "#src/jobs/specs";
import {
  completePadelMatch,
  gameMvpColumns,
  marksClosesAt,
  notificationsOf,
  recordJobs,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { forGame } from "#src/routers/marks/forGame";
import { setMvpMode } from "#src/routers/marks/setMvpMode";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function settleJobsFor(
  jobs: ReturnType<typeof recordJobs>,
  game: PadelMarksGame,
) {
  return jobs.added.filter(
    (job) =>
      job.name === JOB.settleMvp && job.key === settleMvpJobKey(game.gameId),
  );
}

function wrongScore(db: TestDatabase, game: PadelMarksGame) {
  return reportWrongScore(db, {
    gameId: game.gameId,
    matchId: game.matchId,
    userId: game.organizer.id,
  });
}

describe("MVP settlement around the Match completion", () => {
  const jobs = recordJobs();

  it("schedules the settle Job at the close when the score is confirmed", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      const closesAt = await marksClosesAt(db, game.matchId);
      expect(settleJobsFor(jobs, game)).toEqual([
        {
          name: JOB.settleMvp,
          key: settleMvpJobKey(game.gameId),
          payload: { gameId: game.gameId },
          maxAttempts: 5,
          mode: "replace",
          runAt: closesAt,
        },
      ]);
    });
  });

  it("schedules it when an Organizer completes the Match, and not in none mode", async () => {
    await withDb(async (db) => {
      for (const mode of ["vote", "none"] as const) {
        const game = await seatPadelFriendlyGame(db);
        await setMvpMode(db, {
          gameId: game.gameId,
          userId: game.organizer.id,
          mode,
        });
        const firstSet = await db.query.matchSets.findFirst({
          where: eq(matchSets.matchId, game.matchId),
        });
        await scoreSet(db, {
          gameId: game.gameId,
          matchId: game.matchId,
          setId: firstSet!.id,
          userId: game.a.id,
          slot1GamesWon: 6,
          slot2GamesWon: 4,
        });
        await completeMatch(db, {
          gameId: game.gameId,
          matchId: game.matchId,
          userId: game.organizer.id,
        });
        expect(settleJobsFor(jobs, game).map((job) => job.runAt)).toEqual(
          mode === "vote" ? [await marksClosesAt(db, game.matchId)] : [],
        );
      }
    });
  });

  it("suspends on a wrong score, keeps the votes, and schedules again on re-completion", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.a.id,
        candidateUserId: game.c.id,
      });
      const firstClose = await marksClosesAt(db, game.matchId);
      jobs.clear();

      await wrongScore(db, game);
      expect(jobs.removed).toEqual([settleMvpJobKey(game.gameId)]);
      const suspended = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(suspended.window).toBeNull();
      expect(suspended.mvp).toMatchObject({ state: "pending", closesAt: null });
      expect(suspended.viewer).toMatchObject({
        canVote: false,
        vote: game.c.id,
      });
      await expect(
        castMvpVote(db, {
          gameId: game.gameId,
          userId: game.b.id,
          candidateUserId: game.c.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "closed" });

      await completePadelMatch(db, game);
      const closesAt = await marksClosesAt(db, game.matchId);
      expect(closesAt.getTime()).toBeGreaterThanOrEqual(firstClose.getTime());
      expect(settleJobsFor(jobs, game).map((job) => job.runAt)).toEqual([
        closesAt,
      ]);
      const reopened = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(reopened.window).toMatchObject({ state: "open", closesAt });
      expect(reopened.mvp).toMatchObject({
        state: "pending",
        votes: { cast: 1, eligible: 4 },
      });
    });
  });

  it("clears a settled decision on a wrong score and settles again at once when everyone had voted", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      for (const voter of [game.a, game.b, game.d]) {
        await castMvpVote(db, {
          gameId: game.gameId,
          userId: voter.id,
          candidateUserId: game.c.id,
        });
      }
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.c.id,
        candidateUserId: game.a.id,
      });
      expect(
        (await gameMvpColumns(db, game.gameId)).mvpSettledAt,
      ).toBeInstanceOf(Date);

      await wrongScore(db, game);
      expect(await gameMvpColumns(db, game.gameId)).toEqual({
        mvpMode: "vote",
        mvpUserId: null,
        mvpDecidedBy: null,
        mvpDecidedAt: null,
        mvpSettledAt: null,
      });
      expect(
        await db.query.gameMvpVotes.findMany({
          where: eq(gameMvpVotes.gameId, game.gameId),
        }),
      ).toHaveLength(4);
      jobs.clear();

      await completePadelMatch(db, game);
      expect(settleJobsFor(jobs, game)).toEqual([]);
      const columns = await gameMvpColumns(db, game.gameId);
      expect(columns).toMatchObject({
        mvpUserId: game.c.id,
        mvpDecidedBy: "vote",
      });
      expect(columns.mvpSettledAt).toBeInstanceOf(Date);
      expect(
        await notificationsOf(db, game.gameId, "mvp_decided"),
      ).toHaveLength(4);
    });
  });

  it("settles on a read after the close when the Job has not run, once", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.a.id,
        candidateUserId: game.d.id,
      });
      const closesAt = await marksClosesAt(db, game.matchId);

      const before = await forGame(
        db,
        { gameId: game.gameId, userId: game.b.id },
        new Date(closesAt.getTime() - 1),
      );
      expect(before.mvp).toMatchObject({ state: "pending", settledAt: null });

      const after = await forGame(
        db,
        { gameId: game.gameId, userId: game.b.id },
        closesAt,
      );
      expect(after.window?.state).toBe("closed");
      expect(after.mvp).toMatchObject({
        state: "decided",
        userId: game.d.id,
        decidedBy: "vote",
        settledAt: closesAt,
        votes: { cast: 1, eligible: 4 },
        tally: [{ userId: game.d.id, votes: 1 }],
      });
      expect(await gameMvpColumns(db, game.gameId)).toMatchObject({
        mvpUserId: game.d.id,
        mvpSettledAt: closesAt,
      });

      await forGame(
        db,
        { gameId: game.gameId, userId: game.c.id },
        new Date(closesAt.getTime() + 60_000),
      );
      const decided = await notificationsOf(db, game.gameId, "mvp_decided");
      expect(decided).toHaveLength(4);
      expect(
        decided.find((row) => row.recipientUserId === game.d.id)?.actorUserId,
      ).toBe(game.d.id);
    });
  });

  it("settles a vote nobody cast with no MVP, and a tie nobody broke with none", async () => {
    await withDb(async (db) => {
      const empty = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, empty);
      const closesAt = await marksClosesAt(db, empty.matchId);
      const view = await forGame(
        db,
        { gameId: empty.gameId, userId: empty.a.id },
        closesAt,
      );
      expect(view.mvp).toMatchObject({
        state: "none",
        userId: null,
        settledAt: closesAt,
        tally: [],
      });

      const tied = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, tied);
      const pairs = [
        [tied.a, tied.c],
        [tied.b, tied.d],
        [tied.c, tied.d],
        [tied.d, tied.c],
      ] as const;
      for (const [voter, candidate] of pairs) {
        await castMvpVote(db, {
          gameId: tied.gameId,
          userId: voter.id,
          candidateUserId: candidate.id,
        });
      }
      const tiedClose = await marksClosesAt(db, tied.matchId);
      const closed = await forGame(
        db,
        { gameId: tied.gameId, userId: tied.organizer.id },
        tiedClose,
      );
      expect(closed.mvp).toMatchObject({
        state: "none",
        userId: null,
        tiedUserIds: null,
      });
      expect(await notificationsOf(db, tied.gameId, "mvp_decided")).toEqual([]);
    });
  });
});
