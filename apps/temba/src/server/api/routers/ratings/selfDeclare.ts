import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { ratings } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { userHasRatedMatch } from "~/server/ratings/has-rated-match";
import {
  initialRatingFromChoice,
  SELF_DECLARE_CHOICES,
  youRatingViewFromState,
  type SelfDeclareChoice,
  type YouRatingView,
} from "~/server/ratings/level";

const sportSchema = z.enum(["padel", "football"]);
const selfDeclareChoiceSchema = z.enum(SELF_DECLARE_CHOICES);

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function selfDeclareRating(
  database: DbClient,
  userId: string,
  sport: "padel" | "football",
  choice: SelfDeclareChoice,
): Promise<YouRatingView> {
  if (await userHasRatedMatch(database, userId, sport)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot declare a Level after a Rated Match",
    });
  }

  const existing = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You have already declared a Level",
    });
  }

  const initial = initialRatingFromChoice(choice);
  const now = new Date();

  try {
    const [created] = await database
      .insert(ratings)
      .values({
        userId,
        sport,
        mu: initial.mu,
        phi: initial.phi,
        sigma: initial.sigma,
        levelBand: initial.levelBand,
        selfDeclaredAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to declare Level",
      });
    }

    return youRatingViewFromState(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      if (await userHasRatedMatch(database, userId, sport)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot declare a Level after a Rated Match",
        });
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "You have already declared a Level",
      });
    }
    throw error;
  }
}

/**
 * One-time self-declare of a starting Level band (or “I don’t know”).
 * Refused after a previous declare or after a Rated Match. Does not block
 * Game register.
 */
export const selfDeclare = protectedProcedure
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
  });
