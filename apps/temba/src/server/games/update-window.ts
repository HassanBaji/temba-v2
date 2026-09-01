import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games, matches } from "@repo/db";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateGameWindowOnGame(
  database: Tx,
  game: GameRow,
  windowStart: Date,
  windowEnd: Date,
  name: string,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
    });
  }
  if (windowEnd.getTime() < windowStart.getTime()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Finish time must be at or after start time",
    });
  }

  const now = new Date();
  await database
    .update(games)
    .set({ windowStart, windowEnd, name, updatedAt: now })
    .where(eq(games.id, game.id));

  if (game.format === "friendly_game") {
    const durationInMinutes = Math.max(
      0,
      Math.round((windowEnd.getTime() - windowStart.getTime()) / 60000),
    );
    await database
      .update(matches)
      .set({
        startTime: windowStart,
        endTime: windowEnd,
        durationInMinutes,
        updatedAt: now,
      })
      .where(eq(matches.gameId, game.id));
  }
}

export async function updateGameWindow(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    windowStart: Date;
    windowEnd: Date;
    name: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    await updateGameWindowOnGame(
      tx,
      game,
      args.windowStart,
      args.windowEnd,
      args.name,
    );
  });
  return { ok: true as const };
}
