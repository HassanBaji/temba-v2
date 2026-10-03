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
import {
  awardKnockoutWalkover,
  isKnockoutMatch,
  placeKnockoutQualifiers,
} from "~/server/games/knockout-advance";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const POOL_MATCH_NOT_AWARDED_MESSAGE =
  "A Pool Match is voided, not awarded, so no team goes through";
export const KNOCKOUT_MATCH_ALREADY_COMPLETED_MESSAGE =
  "This Knockout Match is already completed";

async function cancelMatchOnGame(
  database: Tx,
  game: GameRow,
  matchId: string,
  advancingGameTeamId: string | undefined,
) {
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

  const [match] = await database
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
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

  if (isKnockoutMatch(match)) {
    if (match.status === MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: KNOCKOUT_MATCH_ALREADY_COMPLETED_MESSAGE,
      });
    }
    await awardKnockoutWalkover(database, match, advancingGameTeamId);
    return { cancelledGame: false as const };
  }
  if (advancingGameTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: POOL_MATCH_NOT_AWARDED_MESSAGE,
    });
  }

  const now = new Date();
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.id, match.id));
  await placeKnockoutQualifiers(database, game, match);
  return { cancelledGame: false as const };
}

export async function cancelMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    matchId: string;
    advancingGameTeamId?: string;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return database.transaction(async (tx) => {
    return cancelMatchOnGame(tx, game, args.matchId, args.advancingGameTeamId);
  });
}

export const cancelMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      advancingGameTeamId: z.string().uuid().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelMatch(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      matchId: input.matchId,
      advancingGameTeamId: input.advancingGameTeamId,
    });
  });
