import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function closeRegistrationOnGame(database: DbClient, game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot close a cancelled Game",
    });
  }
  if (game.registrationClosedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Registration is already closed",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ registrationClosedAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function closeRegistration(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await closeRegistrationOnGame(database, game);
  return { ok: true as const };
}
