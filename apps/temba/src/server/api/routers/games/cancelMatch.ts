import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { cancelGameRecord } from "~/server/games/helpers/cancel-game-record";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function cancelMatchOnGame(database: Tx, game: GameRow, matchId: string) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Matches; cancel the Game",
    });
  }

  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Match is already cancelled",
    });
  }

  if (game.format === "friendly_game") {
    await cancelGameRecord(database, game);
    return { cancelledGame: true as const };
  }

  const now = new Date();
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.id, match.id));
  return { cancelledGame: false as const };
}

export async function cancelMatch(
  database: typeof db,
  args: { gameId: string; userId: string; matchId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return database.transaction(async (tx) => {
    return cancelMatchOnGame(tx, game, args.matchId);
  });
}

export const cancelMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      matchId: input.matchId,
    });
  });
