import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, games, matches } from "@repo/db";

import { isPoolTournament } from "~/lib/tournament-rounds";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const UNDO_AFTER_SET_MESSAGE =
  "Cannot undo the Pool draw after a Set has been played";

export async function undoPoolDraw(
  database: DbClient,
  args: { gameId: string; organizerUserId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot undo the Pool draw on a cancelled Game",
    });
  }
  if (
    !isPoolTournament(game.format, game.poolCount) ||
    game.poolCount == null
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Undo the Pool draw on a Friendly tournament",
    });
  }
  if (game.drawPostedAt == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The Pool draw has not been posted",
    });
  }

  const matchRows = await database.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    with: { sets: { columns: { id: true } } },
  });
  if (
    matchRows.some(
      (match) => match.sets.length > 0 || match.status === "completed",
    )
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: UNDO_AFTER_SET_MESSAGE,
    });
  }

  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.gameId, game.id));
    await tx
      .update(gameTeams)
      .set({ poolIndex: null, updatedAt: now })
      .where(eq(gameTeams.gameId, game.id));
    await tx
      .update(games)
      .set({ drawPostedAt: null, updatedAt: now })
      .where(eq(games.id, game.id));
  });

  return { ok: true as const };
}

export const undoPoolDrawInputSchema = z.object({
  gameId: z.string().uuid(),
});

export const undoPoolDrawProcedure = protectedProcedure
  .input(undoPoolDrawInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoPoolDraw(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
    });
  });
