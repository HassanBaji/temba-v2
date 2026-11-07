import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { matchSets } from "@repo/db/schema";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  MARKS_HOUR,
  completePadelMatch,
  completedFootballFriendlyGame,
  matchCompletedAt,
  seatPadelFriendlyGame,
} from "#src/marks/marks.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { scoreSet } from "#src/routers/games/scoreSet";
import { forGame } from "#src/routers/marks/forGame";
import { give } from "#src/routers/marks/give";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

describe("marks.forGame", () => {
  it("is NOT_FOUND to a viewer who cannot open the Game", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await expect(
        forGame(db, { gameId: game.gameId, userId: game.outsider.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        forGame(db, { gameId: game.gameId, userId: game.outsider.id }),
      ).rejects.toBeInstanceOf(TRPCError);
    });
  });

  it("has no window before the Match completes", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      const marks = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(marks.window).toBeNull();
      expect(marks.matchId).toBe(game.matchId);
      expect(marks.viewer).toEqual({
        isParticipant: true,
        canGive: false,
        remaining: 3,
        given: [],
      });
    });
  });

  it("opens for 48 hours from completion, then closes", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await completePadelMatch(db, game);
      const completedAt = await matchCompletedAt(db, game.matchId);
      expect(completedAt).toBeInstanceOf(Date);
      const closesAt = new Date(completedAt!.getTime() + 48 * MARKS_HOUR);

      const open = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(open.window).toEqual({
        state: "open",
        opensAt: completedAt,
        closesAt,
      });
      expect(open.viewer.canGive).toBe(true);

      const closed = await forGame(
        db,
        { gameId: game.gameId, userId: game.a.id },
        closesAt,
      );
      expect(closed.window?.state).toBe("closed");
      expect(closed.viewer.canGive).toBe(false);
    });
  });

  it("opens when an Organizer completes the Match with completeMatch", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
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
      expect(await matchCompletedAt(db, game.matchId)).toBeNull();
      await completeMatch(db, {
        gameId: game.gameId,
        matchId: game.matchId,
        userId: game.organizer.id,
      });
      const completedAt = await matchCompletedAt(db, game.matchId);
      expect(completedAt).toBeInstanceOf(Date);
      const marks = await forGame(db, {
        gameId: game.gameId,
        userId: game.c.id,
      });
      expect(marks.window).toMatchObject({
        state: "open",
        opensAt: completedAt,
      });
    });
  });

  it("lists both sides, every mark with its giver, and the counts", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db, { unclaimedD: true });
      await completePadelMatch(db, game);
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      await give(db, {
        gameId: game.gameId,
        userId: game.c.id,
        receiverUserId: game.b.id,
        kind: "great_wall",
      });
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.d.id,
        kind: "good_game",
      });

      const marks = await forGame(db, {
        gameId: game.gameId,
        userId: game.member.id,
      });
      expect(marks.sport).toBe("padel");
      expect(
        marks.participants.map((participant) => [
          participant.userId,
          participant.slot,
          participant.isUnclaimed,
          participant.bib,
          participant.goals,
        ]),
      ).toEqual([
        [game.a.id, 1, false, null, null],
        [game.b.id, 1, false, null, null],
        [game.c.id, 2, false, null, null],
        [game.d.id, 2, true, null, null],
      ]);
      const bo = marks.participants.find(
        (participant) => participant.userId === game.b.id,
      );
      expect(bo?.received).toEqual([
        { kind: "dynamo", count: 1 },
        { kind: "great_wall", count: 1 },
      ]);
      expect(marks.marks.map((mark) => [mark.giverUserId, mark.kind])).toEqual([
        [game.a.id, "dynamo"],
        [game.c.id, "great_wall"],
        [game.a.id, "good_game"],
      ]);
      expect(marks.summary).toEqual({ given: 3, givers: 2 });
      expect(marks.viewer).toEqual({
        isParticipant: false,
        canGive: false,
        remaining: 3,
        given: [],
      });

      const giver = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(giver.viewer).toEqual({
        isParticipant: true,
        canGive: true,
        remaining: 1,
        given: [
          { receiverUserId: game.b.id, kind: "dynamo" },
          { receiverUserId: game.d.id, kind: "good_game" },
        ],
      });
      expect(
        giver.participants.find((participant) => participant.isViewer)?.userId,
      ).toBe(game.a.id);
    });
  });

  it("carries Bibs, goals and keepers on a football Game", async () => {
    await withDb(async (db) => {
      const game = await completedFootballFriendlyGame(db);
      const marks = await forGame(db, {
        gameId: game.gameId,
        userId: game.organizer.id,
      });
      expect(marks.sport).toBe("football");
      expect(marks.window?.state).toBe("open");
      const [scorer] = game.black;
      expect(
        marks.participants.find(
          (participant) => participant.userId === scorer!.id,
        ),
      ).toMatchObject({ slot: 1, bib: "black", goals: 2, keeper: false });
      expect(
        marks.participants.find(
          (participant) => participant.userId === game.keeper.id,
        ),
      ).toMatchObject({ slot: 1, bib: "black", goals: 0, keeper: true });
      expect(
        marks.participants.filter((participant) => participant.slot === 2),
      ).toHaveLength(2);
      expect(
        marks.participants.every((participant) =>
          participant.slot === 2 ? participant.bib === "white" : true,
        ),
      ).toBe(true);
      expect(marks.viewer.isParticipant).toBe(false);
    });
  });
});
