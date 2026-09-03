import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { leaveRegisteredSeat } from "~/server/games/leave-registered-seat";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveGame(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
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
