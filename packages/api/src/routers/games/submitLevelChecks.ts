import { TRPCError } from "@trpc/server";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  levelCheckBallots,
  matchRatingWindows,
  matches,
  ratings,
} from "@repo/db";

import {
  storedBandFromDisplayLabel,
  type AssignableDisplayLevelBand,
} from "@repo/domain/level-bands";
import { LEVEL_CHECK_BANDS } from "@repo/domain/level-check";
import { ratingWindowState } from "@repo/domain/performance-rating";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { canViewGame, requireGame } from "#src/games/access";
import { footballMatch } from "#src/games/football-lineup";
import { loadMatchParticipants } from "#src/marks/match-participants";
import { levelCheckAsked } from "#src/ratings/level-check";
import { settleRatingWindowIfDue } from "#src/ratings/settle-rating-window";

type DbClient = typeof db;

const MAX_ANSWERS = 8;

/**
 * The viewer's Level check answers on a padel Match whose Rating window asks
 * one, as their whole set: each listed player's band is written or changed,
 * and a player left out loses the viewer's earlier answer, since a blank is
 * not an answer. A seated player answers about any of the other players of
 * the Match who has a padel Rating, never about themselves, and may change
 * their answers until the window closes. Answers are hidden: nobody reads
 * another player's through any door.
 */
export async function submitLevelChecks(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    answers: { userId: string; band: AssignableDisplayLevelBand }[];
    locale?: Locale;
  },
  now: Date = new Date(),
): Promise<{ ok: true }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.levelCheck.errors;
  const answers = args.answers.map((row) => ({
    userId: row.userId,
    band: storedBandFromDisplayLabel(row.band),
  }));
  if (args.answers.some((row) => row.userId === args.userId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.self });
  }
  const rateeIds = args.answers.map((row) => row.userId);
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
    if (!lockedMatch || !window || !levelCheckAsked(window, game.sport)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: errors.noWindow,
      });
    }
    if (ratingWindowState(window, now) !== "open") {
      throw new TRPCError({ code: "CONFLICT", message: errors.closed });
    }

    const participants = await loadMatchParticipants(tx, lockedMatch, game);
    if (!participants.some((row) => row.userId === args.userId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).rating.performance.errors.seatedOnly,
      });
    }
    const seated = new Set(participants.map((row) => row.userId));
    const rated = new Set(
      rateeIds.length === 0
        ? []
        : (
            await tx
              .select({ userId: ratings.userId })
              .from(ratings)
              .where(
                and(
                  inArray(ratings.userId, rateeIds),
                  eq(ratings.sport, GroupSportEnum.PADEL),
                ),
              )
          ).map((row) => row.userId),
    );
    if (rateeIds.some((userId) => !seated.has(userId) || !rated.has(userId))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.notPlayer });
    }

    await tx
      .delete(levelCheckBallots)
      .where(
        and(
          eq(levelCheckBallots.matchId, match.id),
          eq(levelCheckBallots.raterUserId, args.userId),
          ...(rateeIds.length > 0
            ? [notInArray(levelCheckBallots.rateeUserId, rateeIds)]
            : []),
        ),
      );
    for (const { userId, band } of answers) {
      await tx
        .insert(levelCheckBallots)
        .values({
          matchId: match.id,
          raterUserId: args.userId,
          rateeUserId: userId,
          band,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            levelCheckBallots.matchId,
            levelCheckBallots.raterUserId,
            levelCheckBallots.rateeUserId,
          ],
          set: { band, updatedAt: now },
        });
    }
    return { ok: true as const };
  });
}

export const submitLevelChecksProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      answers: z
        .array(
          z.object({
            userId: z.string().uuid(),
            band: z.enum(LEVEL_CHECK_BANDS),
          }),
        )
        .max(MAX_ANSWERS),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return submitLevelChecks(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      answers: input.answers,
      locale: ctx.locale,
    });
  });
