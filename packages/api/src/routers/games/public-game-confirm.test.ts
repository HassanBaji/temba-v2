import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  matches,
  matchResultConfirmations,
  notifications,
  ratingEvents,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { PUBLIC_GAME_CONFIRM_WINDOW_MS } from "#src/games/match-result-confirmations";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmWindowJobKey } from "#src/jobs/specs";
import { gameById } from "#src/routers/games/byId";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { seatedPublicGame } from "#src/routers/games/public-game.test-support";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { scoreSet } from "#src/routers/games/scoreSet";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function matchRow(db: TestDatabase, matchId: string) {
  return db.query.matches.findFirst({ where: eq(matches.id, matchId) });
}

async function confirmedUserIds(db: TestDatabase, matchId: string) {
  const rows = await db.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
  });
  return rows.map((row) => row.userId).sort();
}

async function backdateConfirmations(
  db: TestDatabase,
  matchId: string,
  at: Date,
) {
  await db
    .update(matchResultConfirmations)
    .set({ confirmedAt: at })
    .where(eq(matchResultConfirmations.matchId, matchId));
}

describe("Public Game score confirmation (ADR-0071)", () => {
  const jobs = recordJobs();

  it("does not complete on the creator's entry and confirmation alone", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      const enteredAt = Date.now();
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.creator,
      });
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.b,
      });
      await expect(
        completeMatch(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: g.creator,
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: messagesFor("en").game.errors.completeOrganizerOnly,
      } satisfies Partial<TRPCError>);
      await expect(
        confirmMatchResult(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: g.creator,
          slot: 2,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(await confirmedUserIds(db, g.matchId)).toEqual([g.creator]);

      const window = jobs.added.find(
        (job) => job.key === confirmWindowJobKey(g.matchId),
      );
      expect(window).toMatchObject({
        name: "match.confirm-window",
        mode: "replace",
        payload: { matchId: g.matchId },
      });
      expect(window!.runAt!.getTime()).toBeGreaterThanOrEqual(
        enteredAt + PUBLIC_GAME_CONFIRM_WINDOW_MS,
      );

      const asked = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, g.gameId),
          eq(notifications.type, "match_score_to_confirm"),
        ),
      });
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [g.c, g.d].sort(),
      );
    });
  });

  it("completes on the other side's confirmation and rates at weight 1", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });

      const match = await matchRow(db, g.matchId);
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).toBeNull();
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, g.matchId),
      });
      expect(events.map((event) => event.userId).sort()).toEqual(
        [g.creator, g.b, g.c, g.d].sort(),
      );
      expect(events.every((event) => event.weight === 1)).toBe(true);

      const details = await gameById(db, {
        gameId: g.gameId,
        userId: g.c,
      });
      expect(details.matches[0]?.stoodUnconfirmed).toBe(false);
      expect(details.confirmWindow).toBeNull();
      expect(details.matchResultConfirmation?.confirmedByOrganizer).toBe(false);
    });
  });

  it("clears confirmations and restarts the 24 hours on a changed score", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      const enteredAt = new Date(Date.now() - 20 * 60 * 60 * 1000);
      await backdateConfirmations(db, g.matchId, enteredAt);
      jobs.clear();

      const changedAt = Date.now();
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.c,
        slot1GamesWon: 3,
        slot2GamesWon: 6,
      });
      expect(await confirmedUserIds(db, g.matchId)).toEqual([g.c]);
      const window = jobs.added.find(
        (job) => job.key === confirmWindowJobKey(g.matchId),
      );
      expect(window!.runAt!.getTime()).toBeGreaterThanOrEqual(
        changedAt + PUBLIC_GAME_CONFIRM_WINDOW_MS,
      );

      const forCreator = await gameById(db, {
        gameId: g.gameId,
        userId: g.creator,
      });
      expect(forCreator.confirmWindow?.closesAt.getTime()).toBe(
        window!.runAt!.getTime(),
      );
      expect(forCreator.confirmWindow?.viewerMayConfirm).toBe(true);
      const forD = await gameById(db, { gameId: g.gameId, userId: g.d });
      expect(forD.confirmWindow?.viewerMayConfirm).toBe(false);

      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.d,
      });
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.b,
      });
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.COMPLETED,
      );
    });
  });

  it("lets a confirmation after the 24 hours stand without counting", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      await backdateConfirmations(
        db,
        g.matchId,
        new Date(Date.now() - PUBLIC_GAME_CONFIRM_WINDOW_MS - 60_000),
      );
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });

      const match = await matchRow(db, g.matchId);
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);
      const details = await gameById(db, {
        gameId: g.gameId,
        userId: g.c,
      });
      expect(details.matches[0]?.stoodUnconfirmed).toBe(true);
      expect(details.matchResultConfirmation?.confirmedByOrganizer).toBe(false);
    });
  });

  it("lets the same score saved by the other side after the 24 hours stand without counting", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      const score = { slot1GamesWon: 6, slot2GamesWon: 3 };
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        ...score,
      });
      await backdateConfirmations(
        db,
        g.matchId,
        new Date(Date.now() - PUBLIC_GAME_CONFIRM_WINDOW_MS - 60_000),
      );
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.c,
        ...score,
      });

      const match = await matchRow(db, g.matchId);
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);
      expect(await confirmedUserIds(db, g.matchId)).toEqual([g.creator]);
    });
  });

  describe("a Match reopened by a wrong-score report", () => {
    /** Entered 6-3 by the creator, confirmed by `c`, then reopened: the Sets stay and the confirmations go. */
    async function reopened(db: TestDatabase) {
      const g = await seatedPublicGame(db);
      await scoreSet(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        setId: g.setId,
        userId: g.creator,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });
      await reportWrongScore(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.creator,
      });
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(await confirmedUserIds(db, g.matchId)).toEqual([]);
      await db.delete(notifications);
      jobs.clear();
      return g;
    }

    async function askedToConfirm(db: TestDatabase, gameId: string) {
      const rows = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, gameId),
          eq(notifications.type, "match_score_to_confirm"),
        ),
      });
      return rows.map((row) => row.recipientUserId).sort();
    }

    function windowJob(matchId: string) {
      return jobs.added.find((job) => job.key === confirmWindowJobKey(matchId));
    }

    it("starts the 24 hours and asks the other side on a confirm tap", async () => {
      await withDb(async (db) => {
        const g = await reopened(db);
        const tappedAt = Date.now();
        await confirmMatchResult(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: g.c,
        });

        expect((await matchRow(db, g.matchId))?.status).toBe(
          MatchStatusEnum.PENDING,
        );
        expect(windowJob(g.matchId)).toMatchObject({
          name: "match.confirm-window",
          payload: { matchId: g.matchId },
        });
        expect(windowJob(g.matchId)!.runAt!.getTime()).toBeGreaterThanOrEqual(
          tappedAt + PUBLIC_GAME_CONFIRM_WINDOW_MS,
        );
        expect(await askedToConfirm(db, g.gameId)).toEqual(
          [g.creator, g.b].sort(),
        );
        const forCreator = await gameById(db, {
          gameId: g.gameId,
          userId: g.creator,
        });
        expect(forCreator.confirmWindow).toMatchObject({
          closesAt: windowJob(g.matchId)!.runAt,
          viewerMayConfirm: true,
        });

        jobs.clear();
        await confirmMatchResult(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: g.d,
        });
        expect(windowJob(g.matchId)).toBeUndefined();
        expect(await askedToConfirm(db, g.gameId)).toHaveLength(2);

        await confirmMatchResult(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: g.b,
        });
        const match = await matchRow(db, g.matchId);
        expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
        expect(match?.stoodUnconfirmedAt).toBeNull();
        expect(
          await db.query.ratingEvents.findMany({
            where: eq(ratingEvents.matchId, g.matchId),
          }),
        ).toHaveLength(4);
      });
    });

    it("starts the 24 hours and asks the other side when the same score is saved again", async () => {
      await withDb(async (db) => {
        const g = await reopened(db);
        const savedAt = Date.now();
        await scoreSet(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          setId: g.setId,
          userId: g.creator,
          slot1GamesWon: 6,
          slot2GamesWon: 3,
        });

        expect(await confirmedUserIds(db, g.matchId)).toEqual([g.creator]);
        expect(windowJob(g.matchId)!.runAt!.getTime()).toBeGreaterThanOrEqual(
          savedAt + PUBLIC_GAME_CONFIRM_WINDOW_MS,
        );
        expect(await askedToConfirm(db, g.gameId)).toEqual([g.c, g.d].sort());

        jobs.clear();
        await scoreSet(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          setId: g.setId,
          userId: g.b,
          slot1GamesWon: 6,
          slot2GamesWon: 3,
        });
        expect(windowJob(g.matchId)).toBeUndefined();
        expect(await askedToConfirm(db, g.gameId)).toHaveLength(2);
      });
    });
  });
});
