import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { marks, notifications } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  MARKS_HOUR,
  completePadelMatch,
  matchCompletedAt,
  seatPadelFriendlyGame,
} from "#src/marks/marks.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { JOB } from "#src/jobs/specs";
import { give } from "#src/routers/marks/give";
import { retract } from "#src/routers/marks/retract";

async function withCompletedGame(
  run: (
    db: TestDatabase,
    game: Awaited<ReturnType<typeof seatPadelFriendlyGame>>,
  ) => Promise<void>,
) {
  const { db, close } = await createPgliteDb();
  try {
    const game = await seatPadelFriendlyGame(db);
    await completePadelMatch(db, game);
    await run(db, game);
  } finally {
    await close();
  }
}

function markReceived(db: TestDatabase, userId: string) {
  return db.query.notifications.findMany({
    where: and(
      eq(notifications.recipientUserId, userId),
      eq(notifications.type, "mark_received"),
    ),
  });
}

describe("marks.retract", () => {
  const jobs = recordJobs();
  const emailJobs = () =>
    jobs.added.filter((job) => job.name === JOB.notificationEmail);

  it("takes back the giver's own mark, frees the slot, and withdraws the unseen Notification", async () => {
    await withCompletedGame(async (db, game) => {
      jobs.clear();
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      await retract(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
      });
      expect(
        await db.query.marks.findMany({
          where: eq(marks.matchId, game.matchId),
        }),
      ).toHaveLength(0);
      expect(await markReceived(db, game.b.id)).toHaveLength(0);
      expect(jobs.removed).toEqual(emailJobs().map((job) => job.key));

      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "clutch",
      });
      expect(await markReceived(db, game.b.id)).toMatchObject([
        { markKind: "clutch" },
      ]);
    });
  });

  it("tells the receiver once however often a mark is given and taken back after they saw it", async () => {
    await withCompletedGame(async (db, game) => {
      jobs.clear();
      const args = {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
      };
      await give(db, { ...args, kind: "dynamo" });
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.recipientUserId, game.b.id));
      for (let round = 0; round < 3; round += 1) {
        await retract(db, args);
        await give(db, { ...args, kind: "clutch" });
      }
      expect(await markReceived(db, game.b.id)).toHaveLength(1);
      expect(emailJobs()).toHaveLength(1);
      expect(jobs.removed).toEqual([]);
    });
  });

  it("cannot take back someone else's mark", async () => {
    await withCompletedGame(async (db, game) => {
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      await expect(
        retract(db, {
          gameId: game.gameId,
          userId: game.c.id,
          receiverUserId: game.b.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(
        await db.query.marks.findMany({
          where: eq(marks.matchId, game.matchId),
        }),
      ).toHaveLength(1);
    });
  });

  it("is refused once the window has closed", async () => {
    await withCompletedGame(async (db, game) => {
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      const completedAt = await matchCompletedAt(db, game.matchId);
      await expect(
        retract(
          db,
          {
            gameId: game.gameId,
            userId: game.a.id,
            receiverUserId: game.b.id,
          },
          new Date(completedAt!.getTime() + 48 * MARKS_HOUR),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "window_closed" });
      expect(
        await db.query.marks.findMany({
          where: eq(marks.matchId, game.matchId),
        }),
      ).toHaveLength(1);
    });
  });
});
