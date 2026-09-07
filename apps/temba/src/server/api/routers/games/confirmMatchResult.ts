import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requireGame } from "~/server/games/access";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
} from "~/server/games/match-result-confirmations";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";
import { runMatchCompletionEffect } from "~/server/games/run-match-completion-effect";
import { userIsOnMatchSlots } from "~/server/games/user-is-on-match-slots";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A seated User's confirmation that a Match's entered Sets are correct
 * (ADR-0011). Self-only: the caller must be seated on either of the Match's
 * two Game teams. The Match must already have a result and must not already
 * be completed or cancelled. Idempotent per Match+User. Once every seated
 * User has confirmed, this runs the same complete-and-rate effect as the
 * organizer's unilateral `completeMatch` door.
 */
export async function confirmMatchResult(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);

  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot confirm the result of a cancelled Match",
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Match is already completed",
    });
  }
  if (!(await userIsOnMatchSlots(database, match, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only Users seated on this Match’s Game teams can confirm its result",
    });
  }

  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(sets);
  if (outcome.result === "none") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Match has no result yet to confirm",
    });
  }

  await recordMatchResultConfirmation(database, match.id, args.userId);

  if (await matchResultFullyConfirmed(database, match)) {
    await runMatchCompletionEffect(database, game, match.id);
  }

  return { ok: true as const };
}

export const confirmMatchResultProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmMatchResult(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
    });
  });
