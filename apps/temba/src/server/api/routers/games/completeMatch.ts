import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { MatchStatusEnum, matchSets, matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isGameOrganizer, requireGame } from "~/server/games/access";
import { bothSlotsFilled } from "~/server/games/both-slots-filled";
import { bothSlottedTeamsComplete } from "~/server/games/both-slotted-teams-complete";
import { matchOutcome } from "~/server/games/match-outcome";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";
import { userIsOnMatchSlots } from "~/server/games/user-is-on-match-slots";
import { applyRatedMatch } from "~/server/ratings/apply-rated-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function completeMatch(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  const organizer = await isGameOrganizer(database, game, args.userId);

  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Matches to complete this slice",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot complete a cancelled Match",
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Match is already completed",
    });
  }
  if (!(await bothSlottedTeamsComplete(database, match))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Both Match slots need complete Game teams before completing the Match",
    });
  }
  if (!organizer) {
    if (!bothSlotsFilled(match)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only an organizer can complete this Match",
      });
    }
    if (!(await userIsOnMatchSlots(database, match, args.userId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only the organizer or Users on this Match’s Game teams can complete it",
      });
    }
  }
  await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    if (!locked) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found",
      });
    }
    if (locked.status === MatchStatusEnum.CANCELLED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot complete a cancelled Match",
      });
    }
    if (locked.status === MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Match is already completed",
      });
    }

    const sets = await tx.query.matchSets.findMany({
      where: eq(matchSets.matchId, locked.id),
      columns: { slot1GamesWon: true, slot2GamesWon: true },
    });
    if (sets.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Add at least one Set before completing the Match",
      });
    }
    const outcome = matchOutcome(sets);
    if (outcome.result === "none") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Score at least one Set before completing the Match",
      });
    }

    await tx
      .update(matches)
      .set({ status: MatchStatusEnum.COMPLETED, updatedAt: new Date() })
      .where(eq(matches.id, locked.id));

    await applyRatedMatch(tx, game, locked, outcome.result);
  });
  return { ok: true as const };
}

export const completeMatchProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return completeMatch(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
    });
  });
