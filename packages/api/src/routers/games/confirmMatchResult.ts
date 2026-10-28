import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame, type GameRow } from "#src/games/access";
import {
  KNOCKOUT_LEVEL_MESSAGE,
  knockoutMatchIsLevel,
} from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  matchResultFullyConfirmed,
  matchSideSeats,
  recordMatchResultConfirmation,
  recordOrganizerSideConfirmation,
  sideHasNoAccountHolder,
  type MatchSideSeats,
  type MatchSlot,
} from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { type MatchRow } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const NOT_SEATED_MESSAGE =
  "Only Users seated on this Match’s Game teams can confirm its result";

async function organizerSideToConfirm(
  database: DbClient,
  args: {
    game: GameRow;
    match: MatchRow;
    userId: string;
    slot: MatchSlot | undefined;
  },
): Promise<MatchSideSeats> {
  if (!(await isGameOrganizer(database, args.game, args.userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        args.slot === undefined
          ? NOT_SEATED_MESSAGE
          : "Only an organizer can confirm for a side",
    });
  }
  const sides = (await matchSideSeats(database, args.match)).filter(
    sideHasNoAccountHolder,
  );
  if (sides.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_SEATED_MESSAGE });
  }
  if (args.slot === undefined) {
    if (sides.length > 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose the side to confirm for",
      });
    }
    return sides[0]!;
  }
  const side = sides.find((entry) => entry.slot === args.slot);
  if (!side) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Players on that side confirm for themselves",
    });
  }
  return side;
}

/**
 * A seated User's confirmation that a Match's entered Sets are correct
 * (ADR-0011). Self-only for a seated User. An Organizer confirms on behalf of
 * a side with no account holder, naming its `slot` when more than one side
 * has none or when the Organizer is seated. The Match must already have a
 * result and must not already be completed or cancelled. Idempotent per
 * Match+User. Once the result is agreed, this runs the same complete-and-rate
 * effect as the organizer's unilateral `completeMatch` door.
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
  const organizerSide =
    args.slot === undefined &&
    (await userIsOnMatchSlots(database, match, args.userId))
      ? null
      : await organizerSideToConfirm(database, {
          game,
          match,
          userId: args.userId,
          slot: args.slot,
        });

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

  if (organizerSide) {
    await recordOrganizerSideConfirmation(database, match.id, organizerSide);
  } else {
    await recordMatchResultConfirmation(database, match.id, args.userId);
  }

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
