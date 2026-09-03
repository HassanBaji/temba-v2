import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { matchSets } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isGameOrganizer, requireGame } from "~/server/games/access";
import { assertMayWriteSets } from "~/server/games/assert-may-write-sets";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addSet(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);
  await assertMayWriteSets(database, game, match, args.userId, organizer);
  const [created] = await database
    .insert(matchSets)
    .values({ matchId: match.id })
    .returning();
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add Set",
    });
  }
  return { id: created.id };
}

export const addSetProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addSet(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
    });
  });
