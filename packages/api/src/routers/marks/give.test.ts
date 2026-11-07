import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { marks, matches, notifications } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import type { MarkKind } from "@repo/domain/marks";

import {
  MARKS_HOUR,
  completePadelMatch,
  completedFootballFriendlyGame,
  matchCompletedAt,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
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

function giveAs(
  db: TestDatabase,
  game: { gameId: string },
  giver: { id: string },
  receiver: { id: string },
  kind: MarkKind,
  now?: Date,
) {
  return give(
    db,
    {
      gameId: game.gameId,
      userId: giver.id,
      receiverUserId: receiver.id,
      kind,
    },
    now,
  );
}

async function marksOn(db: TestDatabase, matchId: string) {
  return db.query.marks.findMany({ where: eq(marks.matchId, matchId) });
}

async function receivedNotifications(db: TestDatabase, userId: string) {
  return db.query.notifications.findMany({
    where: and(
      eq(notifications.recipientUserId, userId),
      eq(notifications.type, "mark_received"),
    ),
  });
}

async function completedPadel(
  db: TestDatabase,
  options?: { unclaimedD?: boolean },
): Promise<PadelMarksGame> {
  const game = await seatPadelFriendlyGame(db, options);
  await completePadelMatch(db, game);
  return game;
}

describe("marks.give", () => {
  it("records a mark and notifies the receiver once, with the kind", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      const { markId } = await giveAs(db, game, game.a, game.b, "dynamo");

      const rows = await marksOn(db, game.matchId);
      expect(rows).toMatchObject([
        {
          id: markId,
          giverUserId: game.a.id,
          receiverUserId: game.b.id,
          kind: "dynamo",
        },
      ]);
      const told = await receivedNotifications(db, game.b.id);
      expect(told).toMatchObject([
        {
          audience: "player",
          actorUserId: game.a.id,
          gameId: game.gameId,
          markKind: "dynamo",
          dedupeKey: `mark_received:${markId}`,
        },
      ]);
      expect(await receivedNotifications(db, game.a.id)).toHaveLength(0);
    });
  });

  it("refuses a second mark to the same receiver and a self-mark", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await giveAs(db, game, game.a, game.b, "dynamo");
      await expect(
        giveAs(db, game, game.a, game.b, "clutch"),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "already_marked_receiver",
      });
      await expect(
        giveAs(db, game, game.a, game.a, "clutch"),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "self" });
      expect(await marksOn(db, game.matchId)).toHaveLength(1);
    });
  });

  it("refuses a fourth mark with cap_reached", async () => {
    await withDb(async (db) => {
      const padel = await completedPadel(db);
      await giveAs(db, padel, padel.a, padel.b, "dynamo");
      await giveAs(db, padel, padel.a, padel.c, "good_game");
      await giveAs(db, padel, padel.a, padel.d, "underdog");
      const marks = await forGame(db, {
        gameId: padel.gameId,
        userId: padel.a.id,
      });
      expect(marks.viewer).toMatchObject({ canGive: false, remaining: 0 });
      await expect(
        giveAs(db, padel, padel.a, padel.b, "clutch"),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "cap_reached" });

      const football = await completedFootballFriendlyGame(db);
      const [yousif, ali, hamad] = football.black;
      const [bo, omar] = football.white;
      await giveAs(db, football, yousif!, ali!, "dynamo");
      await giveAs(db, football, yousif!, hamad!, "let_him_cook");
      await giveAs(db, football, yousif!, bo!, "good_game");
      await expect(
        giveAs(db, football, yousif!, omar!, "underdog"),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "cap_reached" });
      expect(await marksOn(db, football.matchId)).toHaveLength(3);
    });
  });

  it("refuses a kind of the wrong sport or the wrong giver group", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await expect(
        giveAs(db, game, game.a, game.c, "goal_machine"),
      ).rejects.toMatchObject({ message: "kind_not_allowed" });
      await expect(
        giveAs(db, game, game.a, game.b, "great_wall"),
      ).rejects.toMatchObject({ message: "kind_not_allowed" });
      await expect(
        giveAs(db, game, game.a, game.c, "dynamo"),
      ).rejects.toMatchObject({ message: "kind_not_allowed" });
      await giveAs(db, game, game.a, game.c, "smash_machine");
    });
  });

  it("follows the football set: Goal Machine yes, Smash Machine no", async () => {
    await withDb(async (db) => {
      const game = await completedFootballFriendlyGame(db);
      const [yousif, ali] = game.black;
      const [bo] = game.white;
      await giveAs(db, game, ali!, yousif!, "goal_machine");
      await giveAs(db, game, bo!, game.keeper, "great_wall");
      await expect(
        giveAs(db, game, ali!, bo!, "smash_machine"),
      ).rejects.toMatchObject({ message: "kind_not_allowed" });
    });
  });

  it("lets an Unclaimed player receive without a Notification, never give", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db, { unclaimedD: true });
      await giveAs(db, game, game.a, game.d, "good_game");
      expect(await marksOn(db, game.matchId)).toHaveLength(1);
      expect(await receivedNotifications(db, game.d.id)).toHaveLength(0);
      await expect(
        giveAs(db, game, game.d, game.c, "dynamo"),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "not_participant",
      });
    });
  });

  it("refuses a viewer who is not seated and a User who cannot open the Game", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await expect(
        giveAs(db, game, game.member, game.a, "clutch"),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "not_participant",
      });
      await expect(
        giveAs(db, game, game.organizer, game.a, "clutch"),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "not_participant",
      });
      await expect(
        giveAs(db, game, game.outsider, game.a, "clutch"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("refuses before completion and after the window closes", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      await expect(
        giveAs(db, game, game.a, game.b, "dynamo"),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "window_closed" });

      await completePadelMatch(db, game);
      const completedAt = await matchCompletedAt(db, game.matchId);
      const closesAt = new Date(completedAt!.getTime() + 48 * MARKS_HOUR);
      await giveAs(
        db,
        game,
        game.a,
        game.b,
        "dynamo",
        new Date(closesAt.getTime() - 1),
      );
      await expect(
        giveAs(db, game, game.a, game.c, "good_game", closesAt),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "window_closed" });
    });
  });

  it("is suspended by a wrong-score report, keeps the marks, and restarts on re-completion", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await giveAs(db, game, game.a, game.b, "dynamo");
      await db
        .update(matches)
        .set({ completedAt: new Date(Date.now() - 47 * MARKS_HOUR) })
        .where(eq(matches.id, game.matchId));

      await reportWrongScore(db, {
        gameId: game.gameId,
        matchId: game.matchId,
        userId: game.organizer.id,
      });
      expect(await matchCompletedAt(db, game.matchId)).toBeNull();
      await expect(
        giveAs(db, game, game.a, game.c, "good_game"),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "window_closed" });
      const suspended = await forGame(db, {
        gameId: game.gameId,
        userId: game.a.id,
      });
      expect(suspended.window).toBeNull();
      expect(suspended.marks).toHaveLength(1);

      await completePadelMatch(db, game);
      const restartedAt = await matchCompletedAt(db, game.matchId);
      expect(restartedAt!.getTime()).toBeGreaterThan(Date.now() - MARKS_HOUR);
      const inTwoHours = new Date(Date.now() + 2 * MARKS_HOUR);
      const restarted = await forGame(
        db,
        { gameId: game.gameId, userId: game.a.id },
        inTwoHours,
      );
      expect(restarted.window?.state).toBe("open");
      await giveAs(db, game, game.a, game.c, "good_game", inTwoHours);
      expect(await marksOn(db, game.matchId)).toHaveLength(2);
    });
  });
});
