import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { matchSets } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertMayWriteSets } from "#src/games/assert-may-write-sets";
import { lockMatch } from "#src/games/lock-rows";
import { nextMatchSetNumber } from "#src/games/next-match-set-number";
import { requireMatchOnGame } from "#src/games/require-match-on-game";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addSet(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);
  // The Match row lock serialises two adds, so both cannot take one number.
  const created = await database.transaction(async (tx) => {
    const locked = await lockMatch(tx, match.id);
    await assertMayWriteSets(tx, game, locked, args.userId, organizer);
    const setNumber = await nextMatchSetNumber(tx, locked.id);
    const [row] = await tx
      .insert(matchSets)
      .values({ matchId: locked.id, setNumber })
      .returning();
    return row;
  });
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
