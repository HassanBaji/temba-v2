import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { leaveWaitlistEntry } from "~/server/games/waitlist";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveWaitlist(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  await requireGame(database, args.gameId);
  await leaveWaitlistEntry(database, args.gameId, args.userId);
  return { ok: true as const };
}

export const leaveWaitlistProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveWaitlist(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
