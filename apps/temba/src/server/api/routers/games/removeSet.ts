import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { matchSets } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isGameOrganizer, requireGame } from "~/server/games/access";
import { assertMayWriteSets } from "~/server/games/assert-may-write-sets";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function removeSet(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    userId: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);
  await assertMayWriteSets(database, game, match, args.userId, organizer);
  const deleted = await database
    .delete(matchSets)
    .where(and(eq(matchSets.id, args.setId), eq(matchSets.matchId, match.id)))
    .returning({ id: matchSets.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Set not found",
    });
  }
  return { ok: true as const };
}

export const removeSetProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      setId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removeSet(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      setId: input.setId,
      userId: appUser.id,
    });
  });
