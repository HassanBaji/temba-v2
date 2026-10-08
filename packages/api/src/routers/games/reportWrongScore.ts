import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  levelOverrides,
  MatchStatusEnum,
  matches,
  matchResultConfirmations,
  ratingEvents,
  ratings,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  takeBackKnockoutQualifiers,
  takeBackKnockoutWinner,
} from "#src/games/knockout-advance";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";

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
 * When eligible, in one transaction: restores each Rating (μ, φ, σ) to the
 * before-values stored on this Match's rating events, deletes those four
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
    await takeBackKnockoutWinner(tx, locked);
    await takeBackKnockoutQualifiers(tx, game, locked);

    const matchEvents = await tx.query.ratingEvents.findMany({
      where: eq(ratingEvents.matchId, locked.id),
    });

    const eventUserIds = matchEvents.map((event) => event.userId);
    let laterOverrides: { userId: string; sport: string; createdAt: Date }[] =
      [];
    if (eventUserIds.length > 0) {
      await tx
        .select({ id: ratings.id })
        .from(ratings)
        .where(inArray(ratings.userId, eventUserIds))
        .orderBy(ratings.userId)
        .for("update");
      laterOverrides = await tx
        .select({
          userId: levelOverrides.userId,
          sport: levelOverrides.sport,
          createdAt: levelOverrides.createdAt,
        })
        .from(levelOverrides)
        .where(inArray(levelOverrides.userId, eventUserIds));
    }

    const now = new Date();
    for (const event of matchEvents) {
      // A Level override set after this Match is that User's baseline: their
      // Rating stays as it is, and only the event goes.
      const hasLaterOverride = laterOverrides.some(
        (override) =>
          override.userId === event.userId &&
          override.sport === event.sport &&
          override.createdAt > event.createdAt,
      );
      if (hasLaterOverride) {
        continue;
      }
      await tx
        .update(ratings)
        .set({
          mu: event.muBefore,
          phi: event.phiBefore,
          sigma: event.sigmaBefore,
          updatedAt: now,
        })
        .where(
          and(eq(ratings.userId, event.userId), eq(ratings.sport, event.sport)),
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
