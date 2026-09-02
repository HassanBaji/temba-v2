import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { GroupSportEnum, ratingEvents, ratings } from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { userHasRatedMatch } from "~/server/ratings/has-rated-match";
import { youRatingViewAfterIdle } from "~/server/ratings/idle";
import {
  displayedLevelFromMu,
  levelFromMu,
  progressToNextBand,
  SELF_DECLARE_CHOICES,
  type LevelBand,
} from "~/server/ratings/level";
import { selfDeclareRating } from "~/server/ratings/self-declare";

const sportSchema = z.enum(["padel", "football"]);
const selfDeclareChoiceSchema = z.enum(SELF_DECLARE_CHOICES);

type DbClient = typeof db;

/** Recent Rated Match Level points for the home sparkline. */
const HISTORY_EVENT_LIMIT = 15;

async function padelLevelHistory(
  database: DbClient,
  userId: string,
): Promise<string[]> {
  const events = await database.query.ratingEvents.findMany({
    where: and(
      eq(ratingEvents.userId, userId),
      eq(ratingEvents.sport, GroupSportEnum.PADEL),
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    limit: HISTORY_EVENT_LIMIT,
    columns: {
      muBefore: true,
      muAfter: true,
    },
  });

  if (events.length === 0) {
    return [];
  }

  const chronological = [...events].reverse();
  const first = chronological[0];
  if (!first) {
    return [];
  }

  const history = [displayedLevelFromMu(first.muBefore)];
  for (const event of chronological) {
    history.push(displayedLevelFromMu(event.muAfter));
  }
  return history;
}

export const ratingsRouter = createTRPCRouter({
  /**
   * Current padel Rating for the signed-in User. Idle RD inflation is applied
   * for display (not persisted). Returns product Level / Level band /
   * Provisional only — never raw Glicko μ/φ/σ. Also includes progress within
   * the current Level band and recent Level history for the home sparkline.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    const row = await ctx.db.query.ratings.findFirst({
      where: and(
        eq(ratings.userId, appUser.id),
        eq(ratings.sport, GroupSportEnum.PADEL),
      ),
    });

    if (!row) {
      return {
        rating: null,
        canSelfDeclare: !(await userHasRatedMatch(
          ctx.db,
          appUser.id,
          GroupSportEnum.PADEL,
        )),
        progressPercent: null as number | null,
        nextBand: null as LevelBand | null,
        history: [] as string[],
      };
    }

    const rating = youRatingViewAfterIdle(row, new Date());
    // Idle inflation does not change μ; progress uses the same continuous Level
    // as the displayed product number.
    const progress = progressToNextBand(levelFromMu(row.mu), rating.levelBand);
    const history = await padelLevelHistory(ctx.db, appUser.id);

    return {
      rating,
      canSelfDeclare: false,
      progressPercent: progress.progressPercent,
      nextBand: progress.nextBand,
      history,
    };
  }),

  /**
   * One-time self-declare of a starting Level band (or “I don’t know”).
   * Refused after a previous declare or after a Rated Match. Does not block
   * Game register.
   */
  selfDeclare: protectedProcedure
    .input(
      z.object({
        sport: sportSchema,
        choice: selfDeclareChoiceSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appUser = await resolveAppUser(ctx.userId);
      const rating = await selfDeclareRating(
        ctx.db,
        appUser.id,
        input.sport,
        input.choice,
      );
      return { rating };
    }),
});
