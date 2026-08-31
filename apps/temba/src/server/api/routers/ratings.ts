import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { GroupSportEnum, ratings } from "@repo/db";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { userHasRatedMatch } from "~/server/ratings/has-rated-match";
import { youRatingViewAfterIdle } from "~/server/ratings/idle";
import { SELF_DECLARE_CHOICES } from "~/server/ratings/level";
import { selfDeclareRating } from "~/server/ratings/self-declare";

const sportSchema = z.enum(["padel", "football"]);
const selfDeclareChoiceSchema = z.enum(SELF_DECLARE_CHOICES);

export const ratingsRouter = createTRPCRouter({
  /**
   * Current padel Rating for the signed-in User. Idle RD inflation is applied
   * for display (not persisted). Returns product Level / Level band /
   * Provisional only — never raw Glicko μ/φ/σ.
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
      };
    }

    return {
      rating: youRatingViewAfterIdle(row, new Date()),
      canSelfDeclare: false,
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
