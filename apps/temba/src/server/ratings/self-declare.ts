import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { ratings } from "@repo/db";

import { type db } from "~/server/db";
import { userHasRatedMatch } from "~/server/ratings/has-rated-match";
import {
  initialRatingFromChoice,
  youRatingViewFromState,
  type SelfDeclareChoice,
  type YouRatingView,
} from "~/server/ratings/level";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

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
