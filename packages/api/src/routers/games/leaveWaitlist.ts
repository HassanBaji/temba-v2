import { z } from "zod";

import { type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame, requireNotChallengeGame } from "#src/games/access";
import { leaveWaitlistEntry } from "#src/games/leave-waitlist-entry";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveWaitlist(
  database: DbClient,
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const game = await requireGame(database, args.gameId);
  requireNotChallengeGame(game, args.locale);
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
      locale: ctx.locale,
    });
  });
