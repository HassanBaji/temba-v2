import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";
import { type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";

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
  args: { gameId: string; userId: string; locale?: Locale },
) {
  const game = await requireGame(database, args.gameId);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId);
  await closeRegistrationOnGame(database, game);
  return { ok: true as const };
}

export const closeRegistrationProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return closeRegistration(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
