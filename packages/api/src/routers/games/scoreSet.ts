import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { matchSets } from "@repo/db";

import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "@repo/domain/friendly-game-results";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { assertMayWriteSets } from "#src/games/assert-may-write-sets";
import { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
import { knockoutMatchIsLevel } from "#src/games/knockout-advance";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  clearMatchResultConfirmations,
  clearMatchResultConfirmationsExceptUser,
  matchResultFullyConfirmed,
  recordMatchResultConfirmation,
} from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { runMatchCompletionEffect } from "#src/games/run-match-completion-effect";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function scoreSet(
  database: DbClient,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    userId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
  },
) {
  for (const gamesWon of [args.slot1GamesWon, args.slot2GamesWon]) {
    if (
      gamesWon < FRIENDLY_SET_GAMES_MIN ||
      gamesWon > FRIENDLY_SET_GAMES_MAX
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Games won in a Set must be between ${FRIENDLY_SET_GAMES_MIN} and ${FRIENDLY_SET_GAMES_MAX}`,
      });
    }
  }
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);
  await assertMayWriteSets(database, game, match, args.userId, organizer);
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Both Match slots need complete Game teams before entering games won",
    });
  }
  const set = await database.query.matchSets.findFirst({
    where: eq(matchSets.id, args.setId),
  });
  if (set?.matchId !== match.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Set not found",
    });
  }
  const valuesChanged =
    set.slot1GamesWon !== args.slot1GamesWon ||
    set.slot2GamesWon !== args.slot2GamesWon;
  const [updated] = await database
    .update(matchSets)
    .set({
      slot1GamesWon: args.slot1GamesWon,
      slot2GamesWon: args.slot2GamesWon,
      updatedAt: new Date(),
    })
    .where(eq(matchSets.id, set.id))
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Set",
    });
  }

  // ADR-0011: the User who enters the Set that produces (or changes) a Match
  // result is confirmed automatically. Editing games-won values after at
  // least one confirmation already exists clears the others, so a changed
  // score requires re-agreement rather than surviving on stale confirmations.
  const allSets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, match.id),
    columns: { slot1GamesWon: true, slot2GamesWon: true },
  });
  const outcome = matchOutcome(allSets);
  if (knockoutMatchIsLevel(match, outcome.result)) {
    await clearMatchResultConfirmations(database, match.id);
  } else if (outcome.result !== "none") {
    if (valuesChanged) {
      await clearMatchResultConfirmationsExceptUser(
        database,
        match.id,
        args.userId,
      );
    }
    await recordMatchResultConfirmation(database, match.id, args.userId);
    if (await matchResultFullyConfirmed(database, match)) {
      await runMatchCompletionEffect(database, game, match.id);
    }
  }

  return { ok: true as const };
}

export const scoreSetProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
      setId: z.string().uuid(),
      slot1GamesWon: z
        .number()
        .int()
        .min(FRIENDLY_SET_GAMES_MIN)
        .max(FRIENDLY_SET_GAMES_MAX),
      slot2GamesWon: z
        .number()
        .int()
        .min(FRIENDLY_SET_GAMES_MIN)
        .max(FRIENDLY_SET_GAMES_MAX),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return scoreSet(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      setId: input.setId,
      userId: appUser.id,
      slot1GamesWon: input.slot1GamesWon,
      slot2GamesWon: input.slot2GamesWon,
    });
  });
