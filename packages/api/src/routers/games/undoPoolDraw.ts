import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, games, matches } from "@repo/db";

import {
  isDrawnTournament,
  isKnockoutOnly,
} from "@repo/domain/tournament-rounds";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const UNDO_AFTER_SET_MESSAGE =
  "Cannot undo the group draw after a Set has been played";
export const UNDO_KNOCKOUT_AFTER_SET_MESSAGE =
  "Cannot undo the draw after a Set has been played";

function drawNoun(game: { format: string; tournamentShape: string | null }) {
  return isKnockoutOnly(game.format, game.tournamentShape)
    ? "draw"
    : "group draw";
}

export async function undoPoolDraw(
  database: DbClient,
  args: { gameId: string; organizerUserId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot undo the ${drawNoun(game)} on a cancelled Game`,
    });
  }
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Undo the group draw on a Friendly tournament",
    });
  }
  if (game.drawPostedAt == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `The ${drawNoun(game)} has not been posted`,
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
      message: isKnockoutOnly(game.format, game.tournamentShape)
        ? UNDO_KNOCKOUT_AFTER_SET_MESSAGE
        : UNDO_AFTER_SET_MESSAGE,
    });
  }

  const now = new Date();
  await database.transaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.gameId, game.id));
    await tx
      .update(gameTeams)
      .set({ poolIndex: null, knockoutSeed: null, updatedAt: now })
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
