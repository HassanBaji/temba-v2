import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";

import { isDrawnTournament } from "@repo/domain/tournament-rounds";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGameOrganizer, requireGame } from "#src/games/access";
import { clearMatchResultConfirmations } from "#src/games/match-result-confirmations";
import { lockMatch } from "#src/games/lock-rows";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { removeJob } from "#src/jobs/enqueue";
import { scoreStandsJobKey } from "#src/jobs/specs";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Records that a tournament Match stopped before a result. Any score entered
 * is cleared and the Match counts for nobody until a score replaces it.
 */
export async function markMatchNotFinished(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a tournament Match can be marked not finished",
    });
  }
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const [organizer, seated] = await Promise.all([
    isGameOrganizer(database, game, args.userId),
    userIsOnMatchSlots(database, match, args.userId),
  ]);
  if (!organizer && !seated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the two teams or an organizer can do that",
    });
  }
  const now = new Date();
  await database.transaction(async (tx) => {
    const locked = await lockMatch(tx, match.id);
    if (locked.status !== MatchStatusEnum.PENDING) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only a Match still being played can be marked not finished",
      });
    }
    await tx.delete(matchSets).where(eq(matchSets.matchId, match.id));
    await clearMatchResultConfirmations(tx, match.id);
    await tx
      .update(matches)
      .set({ notFinishedAt: now, updatedAt: now })
      .where(eq(matches.id, match.id));
    await removeJob(tx, scoreStandsJobKey(match.id));
  });
  return { ok: true as const };
}

export const markMatchNotFinishedProcedure = protectedProcedure
  .input(z.object({ gameId: z.string().uuid(), matchId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markMatchNotFinished(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
    });
  });
