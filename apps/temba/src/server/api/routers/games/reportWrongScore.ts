import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  matches,
  matchResultConfirmations,
  ratingEvents,
  ratings,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { requireMatchOnGame } from "~/server/games/require-match-on-game";
import { wrongScoreReversalEligibility } from "~/server/games/wrong-score-reversal";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Organizer-only "report a wrong score" reversal — Option A, the gated
 * self-service reversal resolved in
 * `.scratch/game-details-redesign/spec.md` ("Resolved decision") and
 * `docs/adr/0011-match-result-confirmation.md` ("Dispute and rating
 * reversal"). Reopens a completed, rated Friendly Match only when none of
 * its four seated Users has a later Rated Match — Glicko-2 updates are
 * sequential, so restoring stored before-values would otherwise silently
 * erase legitimate later changes.
 *
 * When eligible, in one transaction: restores all four Ratings (μ, φ, σ) to
 * the before-values stored on this Match's rating events, deletes those four
 * rating events, clears the Match's `match_result_confirmations`, and drops
 * `match.status` back to `pending`. No new status/phase is invented — this
 * re-derives the existing `needs_results` phase (`byId.ts`) and re-enters
 * the ADR-0011 confirmation flow from zero on the next score entry.
 *
 * When not eligible, refuses with a distinguishable reason and performs no
 * partial reversal. Also refuses (idempotently) on a Match that is not
 * currently `completed` — including a Match this door already reopened,
 * which is back to `pending` and so fails the same check on a repeat call.
 */
export async function reportWrongScore(
  database: DbClient,
  args: { gameId: string; matchId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  const match = await requireMatchOnGame(database, game.id, args.matchId);
  await assertGameOrganizer(database, game, args.userId);

  if (match.status !== MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Only a completed Match can be reopened for a wrong-score reversal",
    });
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
    // Re-checked under lock: guards a concurrent double-submission (or an
    // already-reopened Match, which is back to `pending`) from re-entering
    // the reversal.
    if (locked.status !== MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Only a completed Match can be reopened for a wrong-score reversal",
      });
    }

    const eligibility = await wrongScoreReversalEligibility(tx, locked.id);
    if (!eligibility.eligible) {
      throw new TRPCError({
        code: "CONFLICT",
        message: eligibility.reason,
      });
    }

    const matchEvents = await tx.query.ratingEvents.findMany({
      where: eq(ratingEvents.matchId, locked.id),
    });

    const now = new Date();
    for (const event of matchEvents) {
      await tx
        .update(ratings)
        .set({
          mu: event.muBefore,
          phi: event.phiBefore,
          sigma: event.sigmaBefore,
          updatedAt: now,
        })
        .where(
          and(
            eq(ratings.userId, event.userId),
            eq(ratings.sport, event.sport),
          ),
        );
    }

    await tx.delete(ratingEvents).where(eq(ratingEvents.matchId, locked.id));
    await tx
      .delete(matchResultConfirmations)
      .where(eq(matchResultConfirmations.matchId, locked.id));
    await tx
      .update(matches)
      .set({ status: MatchStatusEnum.PENDING, updatedAt: now })
      .where(eq(matches.id, locked.id));
  });

  return { ok: true as const };
}

export const reportWrongScoreProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      matchId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return reportWrongScore(ctx.db, {
      gameId: input.gameId,
      matchId: input.matchId,
      userId: appUser.id,
    });
  });
