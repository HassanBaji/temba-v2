import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import {
  assertGameOrganizer,
  isClubGroupGameJoinFrozen,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function reopenRegistrationOnGame(database: DbClient, game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot reopen a cancelled Game",
    });
  }
  if (await isClubGroupGameJoinFrozen(database, game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Cannot reopen a Club Group Game while the Community is archived",
    });
  }
  if (!game.registrationClosedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Registration is not organizer-closed",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ registrationClosedAt: null, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function reopenRegistration(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await reopenRegistrationOnGame(database, game);
  return { ok: true as const };
}
