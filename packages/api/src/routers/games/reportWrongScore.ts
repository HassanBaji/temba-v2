import { TRPCError } from "@trpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  groupLevelOverrides,
  groupRatingEvents,
  groupRatings,
  groupTierEvents,
  groupTierPoints,
  levelOverrides,
  MatchStatusEnum,
  matches,
  matchGoals,
  matchResultConfirmations,
  matchSets,
  ratingEvents,
  ratings,
} from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { type LevelBand } from "@repo/domain/level";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  takeBackKnockoutQualifiers,
  takeBackKnockoutWinner,
} from "#src/games/knockout-advance";
import { clearMatchVerifierStamp } from "#src/games/match-result-confirmations";
import { requireMatchOnGame } from "#src/games/require-match-on-game";
import { suspendMvp } from "#src/marks/settle-mvp";
import { reverseFootballLevelMatch } from "#src/ratings/apply-football-level-match";
import { rewriteTierBands } from "#src/ratings/apply-tier-match";
import { suspendRatingWindow } from "#src/ratings/settle-rating-window";
import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Level band and last rated time an event stored from before its Match.
 * An event written before they were stored leaves both as they are.
 */
function bandAndRatedAtBefore(event: {
  levelBandBefore: LevelBand | null;
  lastRatedAtBefore: Date | null;
}) {
  return event.levelBandBefore == null
    ? {}
    : {
        levelBand: event.levelBandBefore,
        lastRatedAt: event.lastRatedAtBefore,
      };
}

/**
 * Restores each Group Level to its before-values on this Match, unless an
 * Organizer set it after the Match, then deletes the Group rating events.
 */
async function reverseGroupRatingEvents(
  tx: DbClient,
  matchId: string,
  now: Date,
) {
  const events = await tx.query.groupRatingEvents.findMany({
    where: eq(groupRatingEvents.matchId, matchId),
  });
  if (events.length === 0) {
    return;
  }
  const userIds = events.map((event) => event.userId);
  await tx
    .select({ id: groupRatings.id })
    .from(groupRatings)
    .where(inArray(groupRatings.userId, userIds))
    .orderBy(groupRatings.userId)
    .for("update");
  const laterOverrides = await tx
    .select({
      userId: groupLevelOverrides.userId,
      groupId: groupLevelOverrides.groupId,
      createdAt: groupLevelOverrides.createdAt,
    })
    .from(groupLevelOverrides)
    .where(inArray(groupLevelOverrides.userId, userIds));

  for (const event of events) {
    const hasLaterOverride = laterOverrides.some(
      (override) =>
        override.userId === event.userId &&
        override.groupId === event.groupId &&
        override.createdAt > event.createdAt,
    );
    if (hasLaterOverride) {
      continue;
    }
    await tx
      .update(groupRatings)
      .set({
        mu: event.muBefore,
        phi: event.phiBefore,
        sigma: event.sigmaBefore,
        ...bandAndRatedAtBefore(event),
        updatedAt: now,
      })
      .where(
        and(
          eq(groupRatings.userId, event.userId),
          eq(groupRatings.groupId, event.groupId),
        ),
      );
  }
  await tx
    .delete(groupRatingEvents)
    .where(eq(groupRatingEvents.matchId, matchId));
}

/**
 * Takes this Match's moves out of Tier points (ADR-0067): each `game` event's
 * delta is subtracted from the member's points, every tier event of the Match
 * is deleted, and the Group's fish are re-cut with a `band_change` event for
 * anyone whose fish moved. The ledger is additive, so later Games and Tier
 * adjustments stay as they are. A member who left the Group has no points row
 * to change.
 */
async function reverseTierEvents(tx: DbClient, matchId: string, now: Date) {
  const events = await tx.query.groupTierEvents.findMany({
    where: and(
      eq(groupTierEvents.matchId, matchId),
      eq(groupTierEvents.kind, "game"),
    ),
  });
  const groupId = events[0]?.groupId;
  if (!groupId) {
    return;
  }
  const rows = await tx
    .select()
    .from(groupTierPoints)
    .where(eq(groupTierPoints.groupId, groupId))
    .orderBy(groupTierPoints.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));

  for (const event of events) {
    const row = rowByUser.get(event.userId);
    if (!row) {
      continue;
    }
    const [updated] = await tx
      .update(groupTierPoints)
      .set({
        points: row.points - event.delta,
        gamesCounted: Math.max(0, row.gamesCounted - 1),
        updatedAt: now,
      })
      .where(eq(groupTierPoints.id, row.id))
      .returning();
    if (updated) {
      rowByUser.set(updated.userId, updated);
    }
  }

  await tx.delete(groupTierEvents).where(eq(groupTierEvents.matchId, matchId));
  await rewriteTierBands(tx, { groupId, matchId: null, rowByUser, now });
}

/**
 * Organizer-only "report a wrong score" reversal — Option A, the gated
 * self-service reversal resolved in
 * `.scratch/game-details-redesign/spec.md` ("Resolved decision") and
 * `docs/adr/0011-match-result-confirmation.md` ("Dispute and rating
 * reversal"). Reopens a completed, rated Friendly Match only when none of
 * its four seated Users has a later Rated Match of the same kind (Temba, or
 * the same Group's, ADR-0053) — Glicko-2 updates are
 * sequential, so restoring stored before-values would otherwise silently
 * erase legitimate later changes. Tier points are additive and are taken
 * back by subtraction whatever came after (ADR-0067), and so is a football
 * Level (ADR-0069). A Rating window is
 * suspended with its ballots kept, and reopens at the next completion
 * (ADR-0068).
 *
 * When eligible, in one transaction: restores each Rating (μ, φ, σ, Level
 * band, last rated time) to the before-values stored on this Match's rating
 * events, deletes those four
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
  args: {
    gameId: string;
    matchId: string;
    userId: string;
    locale?: Locale;
    /** An Operator upholding a Match dispute, checked by that door. */
    asOperator?: boolean;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  const match = await requireMatchOnGame(
    database,
    game.id,
    args.matchId,
    locale,
  );
  if (!args.asOperator) {
    await assertGameOrganizer(database, game, args.userId, locale);
  }
  // A football Challenge Game is Unrated, so nothing needs reversing: the
  // report clears its Score, which reopens both squads (ADR-0060).
  const clearsScore = game.challengeId != null && isFootballGame(game);

  if (match.status !== MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.reopenCompletedOnly,
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
        message: messagesFor(locale).game.errors.matchNotFound,
      });
    }
    // Re-checked under lock: guards a concurrent double-submission (or an
    // already-reopened Match, which is back to `pending`) from re-entering
    // the reversal.
    if (locked.status !== MatchStatusEnum.COMPLETED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.reopenCompletedOnly,
      });
    }

    const eligibility = clearsScore
      ? null
      : await wrongScoreReversalEligibility(tx, locked.id, locale);
    if (eligibility && !eligibility.eligible) {
      throw new TRPCError({
        code: "CONFLICT",
        message: eligibility.reason,
      });
    }
    await takeBackKnockoutWinner(tx, locked, locale);
    await takeBackKnockoutQualifiers(tx, game, locked, locale);

    const matchEvents = await tx.query.ratingEvents.findMany({
      where: and(
        eq(ratingEvents.matchId, locked.id),
        ne(ratingEvents.sport, GroupSportEnum.FOOTBALL),
      ),
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
          ...bandAndRatedAtBefore(event),
          updatedAt: now,
        })
        .where(
          and(eq(ratings.userId, event.userId), eq(ratings.sport, event.sport)),
        );
    }

    await tx
      .delete(ratingEvents)
      .where(
        and(
          eq(ratingEvents.matchId, locked.id),
          ne(ratingEvents.sport, GroupSportEnum.FOOTBALL),
        ),
      );
    await reverseFootballLevelMatch(tx, locked.id, now);
    await reverseGroupRatingEvents(tx, locked.id, now);
    await reverseTierEvents(tx, locked.id, now);
    await suspendRatingWindow(tx, locked.id, now);
    await tx
      .delete(matchResultConfirmations)
      .where(eq(matchResultConfirmations.matchId, locked.id));
    await clearMatchVerifierStamp(tx, locked.id);
    if (clearsScore) {
      await tx
        .update(matchSets)
        .set({ slot1GamesWon: null, slot2GamesWon: null, updatedAt: now })
        .where(eq(matchSets.matchId, locked.id));
      await tx.delete(matchGoals).where(eq(matchGoals.matchId, locked.id));
    }
    await tx
      .update(matches)
      .set({
        status: MatchStatusEnum.PENDING,
        completedAt: null,
        stoodUnconfirmedAt: null,
        updatedAt: now,
      })
      .where(eq(matches.id, locked.id));
    await suspendMvp(tx, game);
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
      locale: ctx.locale,
    });
  });
