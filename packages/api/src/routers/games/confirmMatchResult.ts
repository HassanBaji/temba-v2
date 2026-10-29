import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import {
  KNOCKOUT_LEVEL_MESSAGE,
  knockoutMatchIsLevel,
} from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
  type MatchSlot,
} from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A User's confirmation that a Match's entered Sets are correct (ADR-0011).
 * A seated User confirms for themselves, and the Match completes once the
 * result is agreed. An Organizer's confirmation is final: it completes the
 * Match at once, without waiting on the players (ADR-0044). `slot` is kept
 * for clients that still name the side an Organizer confirms for; it is
 * refused from anyone else. The Match must already have a result and must
 * not already be completed or cancelled. Idempotent per Match+User.
 */
export async function confirmMatchResult(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string; slot?: MatchSlot },
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
  const [seated, organizer] = await Promise.all([
    userIsOnMatchSlots(database, match, args.userId),
    isGameOrganizer(database, game, args.userId),
  ]);
  if (!organizer) {
    if (args.slot !== undefined) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only an organizer can confirm for a side",
      });
    }
    if (!seated) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only Users seated on this Match’s Game teams or an organizer can confirm its result",
      });
    }
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
  if (knockoutMatchIsLevel(match, outcome.result)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: KNOCKOUT_LEVEL_MESSAGE,
    });
  }

  if (seated) {
    await recordMatchResultConfirmation(database, match.id, args.userId);
  }

  if (organizer || (await matchResultFullyConfirmed(database, match))) {
    await runMatchCompletionEffect(database, game, match.id);
  }

  return { ok: true as const };
}

export const confirmMatchResultProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      slot: z.union([z.literal(1), z.literal(2)]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmMatchResult(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
      slot: input.slot,
    });
  });
