import { TRPCError } from "@trpc/server";
import { and, eq, notInArray } from "drizzle-orm";
import { z } from "zod";

import { matchRatingWindows, matches, performanceRatings } from "@repo/db";

import {
  isPerformanceRatingValue,
  raterRoleOf,
  ratingWindowState,
  type RaterRole,
} from "@repo/domain/performance-rating";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { isLevelSetterPublicMetadata } from "#src/auth/require-level-setter";
import { isOperatorPublicMetadata } from "#src/auth/require-operator";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, isGameOrganizer, requireGame } from "#src/games/access";
import { footballMatch } from "#src/games/football-lineup";
import { removeJob } from "#src/jobs/enqueue";
import { ratingWindowSettleJobKey } from "#src/jobs/specs";
import { loadMatchParticipants } from "#src/marks/match-participants";
import {
  settleRatingWindow,
  settleRatingWindowIfDue,
} from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

const MAX_RATINGS = 64;

/**
 * The viewer's Performance ratings on a Friendly game's Match with a Rating
 * window (ADR-0068, ADR-0095), as their
 * whole ballot set: each listed player's rating is written or changed, and a
 * player left out loses the viewer's earlier rating, since a blank is not a
 * zero. A rating is a whole number from 1 to 10, never to yourself, and only
 * to a player of the Match. In Organizer mode only an Organizer of the Game
 * rates, and the submit closes the window: everyone's Tier points move at
 * once. When everyone rates, a seated player rates and may change their
 * ratings until the window closes. Each ballot keeps what the rater was,
 * an Operator, a Level setter or neither, for when the window settles.
 */
export async function submitPerformanceRatings(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    ratings: { userId: string; value: number }[];
    raterRole?: RaterRole;
    locale?: Locale;
  },
  now: Date = new Date(),
): Promise<{ ok: true; settled: boolean }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.performance.errors;
  const raterRole = args.raterRole ?? "player";
  if (args.ratings.some((row) => !isPerformanceRatingValue(row.value))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.value });
  }
  if (args.ratings.some((row) => row.userId === args.userId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.self });
  }
  const rateeIds = args.ratings.map((row) => row.userId);
  if (new Set(rateeIds).size !== rateeIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.duplicate });
  }

  const game = await requireGame(database, args.gameId, locale);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.notFound,
    });
  }
  const match =
    game.format === "friendly_game"
      ? await footballMatch(database, game.id)
      : null;
  if (!match) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errors.noWindow,
    });
  }
  await settleRatingWindowIfDue(database, match.id, now);
  const organizer = await isGameOrganizer(database, game, args.userId);

  return database.transaction(async (tx) => {
    const [lockedMatch] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, match.id))
      .for("update");
    const [window] = await tx
      .select()
      .from(matchRatingWindows)
      .where(eq(matchRatingWindows.matchId, match.id))
      .for("update");
    if (!lockedMatch || !window || window.mode === "off") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: errors.noWindow,
      });
    }
    if (ratingWindowState(window, now) !== "open") {
      throw new TRPCError({ code: "CONFLICT", message: errors.closed });
    }

    const participants = await loadMatchParticipants(tx, lockedMatch, game);
    const seated = new Set(participants.map((row) => row.userId));
    if (window.mode === "organizer" && !organizer) {
      throw new TRPCError({ code: "FORBIDDEN", message: errors.organizerOnly });
    }
    if (window.mode === "everyone" && !seated.has(args.userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: errors.seatedOnly });
    }
    if (rateeIds.some((userId) => !seated.has(userId))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPlayer });
    }

    await tx
      .delete(performanceRatings)
      .where(
        and(
          eq(performanceRatings.matchId, match.id),
          eq(performanceRatings.raterUserId, args.userId),
          ...(rateeIds.length > 0
            ? [notInArray(performanceRatings.rateeUserId, rateeIds)]
            : []),
        ),
      );
    for (const row of args.ratings) {
      await tx
        .insert(performanceRatings)
        .values({
          matchId: match.id,
          raterUserId: args.userId,
          rateeUserId: row.userId,
          value: row.value,
          raterRole,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            performanceRatings.matchId,
            performanceRatings.raterUserId,
            performanceRatings.rateeUserId,
          ],
          set: { value: row.value, raterRole, updatedAt: now },
        });
    }

    if (window.mode !== "organizer") {
      return { ok: true as const, settled: false };
    }
    const settled = await settleRatingWindow(tx, match.id, now, {
      force: true,
    });
    if (settled) {
      await removeJob(tx, ratingWindowSettleJobKey(match.id));
    }
    return { ok: true as const, settled };
  });
}

export const submitPerformanceRatingsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      ratings: z
        .array(z.object({ userId: z.string().uuid(), value: z.number().int() }))
        .max(MAX_RATINGS),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    const publicMetadata = await ctx.getPublicMetadata();
    return submitPerformanceRatings(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      ratings: input.ratings,
      raterRole: raterRoleOf({
        operator: isOperatorPublicMetadata(publicMetadata),
        levelSetter: isLevelSetterPublicMetadata(publicMetadata),
      }),
      locale: ctx.locale,
    });
  });
