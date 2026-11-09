import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The web page a shared result opens on. */
function gameResultPath(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

/** The web link a player shares for a Game's result. */
export async function resultLink(
  database: DbClient,
  args: { gameId: string; userId: string; origin: string },
) {
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }
  return { url: `${args.origin}${gameResultPath(game.id)}` };
}

export const resultLinkProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return resultLink(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      origin: ctx.webOrigin,
    });
  });
