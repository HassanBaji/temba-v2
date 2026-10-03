import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { games } from "@repo/db";

import { hasPools } from "~/lib/tournament-rounds";
import {
  sizeFriendlyTournament,
  validateRoundCount,
} from "~/lib/tournament-sizing";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { assertPoolDrawNotPosted } from "~/server/games/assert-pool-draw-not-posted";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const ROUND_COUNT_NOT_POOL_TOURNAMENT_MESSAGE =
  "Change Rounds on a Friendly tournament";

export async function updateGameRoundCount(
  database: DbClient,
  args: { gameId: string; userId: string; roundCount: number | null },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
    });
  }
  if (!hasPools(game.format, game.poolCount) || game.poolCount == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ROUND_COUNT_NOT_POOL_TOURNAMENT_MESSAGE,
    });
  }
  assertPoolDrawNotPosted(game);

  const sized = sizeFriendlyTournament(game.teamsAllowed ?? 0, game.poolCount);
  if (!sized.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: sized.issue.message,
    });
  }
  const rounds = validateRoundCount(sized.sizing.poolSizes, args.roundCount);
  if (!rounds.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: rounds.issue.message,
    });
  }

  await database
    .update(games)
    .set({ roundCount: rounds.roundCount, updatedAt: new Date() })
    .where(eq(games.id, game.id));

  return { ok: true as const, roundCount: rounds.roundCount };
}

export const updateRoundCount = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      roundCount: z.number().int().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameRoundCount(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      roundCount: input.roundCount,
    });
  });
