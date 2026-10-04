import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { leaveRegisteredSeat } from "#src/games/leave-registered-seat";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveGame(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  assertPoolDrawNotPosted(game);
  await database.transaction(async (tx) => {
    await leaveRegisteredSeat(tx, game, args.userId);
  });
  return { ok: true as const };
}

export const leave = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveGame(ctx.db, { gameId: input.gameId, userId: appUser.id });
  });
