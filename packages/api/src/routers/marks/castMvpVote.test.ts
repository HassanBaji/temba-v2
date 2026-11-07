import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { gameMvpVotes } from "@repo/db/schema";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { settleMvpJobKey } from "#src/jobs/specs";
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

function vote(
  db: TestDatabase,
  game: PadelMarksGame,
  voterUserId: string,
  candidateUserId: string,
  now?: Date,
) {
  return castMvpVote(
    db,
    { gameId: game.gameId, userId: voterUserId, candidateUserId },
    now,
  );
}

describe("marks.castMvpVote", () => {
  const jobs = recordJobs();

  it("keeps one vote per voter, changeable, and shows no tally while pending", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);

      await vote(db, game, game.a.id, game.c.id);
      await vote(db, game, game.a.id, game.d.id);
      await vote(db, game, game.b.id, game.d.id);

      const rows = await db.query.gameMvpVotes.findMany({
        where: eq(gameMvpVotes.gameId, game.gameId),
      });
      expect(
        rows.map((row) => [row.voterUserId, row.candidateUserId]).sort(),
      ).toEqual(
        [
          [game.a.id, game.d.id],
          [game.b.id, game.d.id],
        ].sort(),
      );

      const view = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(view.mvp).toMatchObject({
        mode: "vote",
        state: "pending",
        userId: null,
        votes: { cast: 2, eligible: 4 },
        tally: null,
        tiedUserIds: null,
        settledAt: null,
      });
      expect(view.viewer).toMatchObject({ canVote: true, vote: game.d.id });
      const other = await forGame(db, {
        gameId: game.gameId,
        userId: game.c.id,
      });
      expect(other.viewer).toMatchObject({ canVote: true, vote: null });
      expect((await gameMvpColumns(db, game.gameId)).mvpSettledAt).toBeNull();
    });
  });

  it("refuses a self-vote, a voter or candidate off the Match, and a closed vote", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db, { unclaimedD: true });
      await expect(vote(db, game, game.a.id, game.c.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "closed",
      });

      await completePadelMatch(db, game);
      await expect(vote(db, game, game.a.id, game.a.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "self",
      });
      await expect(
        vote(db, game, game.member.id, game.a.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_voter" });
      await expect(vote(db, game, game.d.id, game.a.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "not_voter",
      });
      await expect(
        vote(db, game, game.organizer.id, game.a.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_voter" });
      await expect(
        vote(db, game, game.a.id, game.member.id),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_candidate" });
      await expect(
        vote(db, game, game.outsider.id, game.a.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await vote(db, game, game.a.id, game.d.id);
      const closesAt = await marksClosesAt(db, game.matchId);
      await expect(
        vote(db, game, game.b.id, game.d.id, closesAt),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "closed" });
    });
  });

  it("refuses a vote when the Organizer picks or there is no MVP", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await setMvpMode(db, {
        gameId: game.gameId,
        userId: game.organizer.id,
        mode: "organizer",
      });
      await completePadelMatch(db, game);
      await expect(vote(db, game, game.a.id, game.c.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "wrong_mode",
      });
    });
  });

  it("settles at once when everyone has voted, removes the Job and tells the players", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      jobs.clear();

      await vote(db, game, game.a.id, game.c.id);
      await vote(db, game, game.b.id, game.c.id);
      await vote(db, game, game.c.id, game.a.id);
      expect(jobs.removed).toEqual([]);
      await vote(db, game, game.d.id, game.c.id);

      expect(jobs.removed).toEqual([settleMvpJobKey(game.gameId)]);
      const columns = await gameMvpColumns(db, game.gameId);
      expect(columns).toMatchObject({
        mvpUserId: game.c.id,
        mvpDecidedBy: "vote",
      });
      expect(columns.mvpSettledAt).toBeInstanceOf(Date);
      expect(columns.mvpDecidedAt).toEqual(columns.mvpSettledAt);

      const decided = await notificationsOf(db, game.gameId, "mvp_decided");
      expect(decided.map((row) => row.recipientUserId).sort()).toEqual(
        [game.a.id, game.b.id, game.c.id, game.d.id].sort(),
      );
      expect(
        decided.every(
          (row) => row.actorUserId === game.c.id && row.audience === "player",
        ),
      ).toBe(true);

      const view = await forGame(db, {
        gameId: game.gameId,
        userId: game.b.id,
      });
      expect(view.mvp).toMatchObject({
        state: "decided",
        userId: game.c.id,
        decidedBy: "vote",
        votes: { cast: 4, eligible: 4 },
        tally: [
          { userId: game.c.id, votes: 3 },
          { userId: game.a.id, votes: 1 },
        ],
      });
      expect(view.viewer.canVote).toBe(false);
      await expect(vote(db, game, game.a.id, game.b.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "closed",
      });
    });
  });

  it("sends a tied vote to the Organizers once and accepts only a tied player", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      jobs.clear();

      await vote(db, game, game.a.id, game.c.id);
      await vote(db, game, game.b.id, game.d.id);
      await vote(db, game, game.c.id, game.d.id);
      await vote(db, game, game.d.id, game.c.id);

      const tieBreak = await notificationsOf(db, game.gameId, "mvp_tie_break");
      expect(tieBreak).toEqual([
        {
          recipientUserId: game.organizer.id,
          audience: "admin",
          actorUserId: null,
          dedupeKey: `mvp_tie_break:${game.gameId}`,
        },
      ]);
      expect(jobs.removed).toEqual([]);
      expect((await gameMvpColumns(db, game.gameId)).mvpSettledAt).toBeNull();
      await expect(vote(db, game, game.a.id, game.d.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "closed",
      });

      const organizerView = await forGame(db, {
        gameId: game.gameId,
        userId: game.organizer.id,
      });
      expect(organizerView.mvp.state).toBe("tie");
      expect([...(organizerView.mvp.tiedUserIds ?? [])].sort()).toEqual(
        [game.c.id, game.d.id].sort(),
      );
      expect(organizerView.viewer).toMatchObject({
        isOrganizer: true,
        canPickMvp: true,
      });
      const playerView = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(playerView.mvp).toMatchObject({
        state: "tie",
        tiedUserIds: null,
        tally: null,
      });

      await expect(
        setMvp(db, {
          gameId: game.gameId,
          userId: game.organizer.id,
          mvpUserId: game.a.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_candidate" });
      await expect(
        setMvp(db, {
          gameId: game.gameId,
          userId: game.a.id,
          mvpUserId: game.c.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "not_organizer" });
      await setMvp(db, {
        gameId: game.gameId,
        userId: game.organizer.id,
        mvpUserId: game.d.id,
      });

      expect(jobs.removed).toEqual([settleMvpJobKey(game.gameId)]);
      expect(await gameMvpColumns(db, game.gameId)).toMatchObject({
        mvpUserId: game.d.id,
        mvpDecidedBy: "tie_break",
      });
      expect(
        (await notificationsOf(db, game.gameId, "mvp_decided")).length,
      ).toBe(4);
      expect(
        (await notificationsOf(db, game.gameId, "mvp_tie_break")).length,
      ).toBe(1);
    });
  });
});
