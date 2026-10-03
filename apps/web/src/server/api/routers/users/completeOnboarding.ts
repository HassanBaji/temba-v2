import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { GroupSportEnum, ratings, user } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Mark the Onboarding questionnaire done for the caller.
 *
 * Both questions must be answered first: a Preferred Position on `user`, and
 * a padel Rating row — which only `ratings.selfDeclare` (or a Rated Match)
 * creates. Either one missing is refused with `PRECONDITION_FAILED` and
 * nothing is written, so the questionnaire cannot be completed past a step.
 *
 * Idempotent: a caller who is already complete — including a User backfilled
 * by the migration, who is complete with a null Preferred Position — gets
 * their existing timestamp back rather than an error or a second write.
 */
export async function markOnboardingComplete(
  database: DbClient,
  args: { userId: string },
) {
  const appUser = await database.query.user.findFirst({
    where: eq(user.id, args.userId),
    columns: {
      id: true,
      preferredPosition: true,
      onboardingCompletedAt: true,
    },
  });

  if (!appUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  if (appUser.onboardingCompletedAt) {
    return { onboardingCompletedAt: appUser.onboardingCompletedAt };
  }

  if (!appUser.preferredPosition) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Choose a Preferred Position first",
    });
  }

  const rating = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, appUser.id),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
    columns: { id: true },
  });

  if (!rating) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Declare a Level first",
    });
  }

  const now = new Date();
  // Guarded on `is null` so two concurrent submissions cannot move an
  // already-recorded completion timestamp.
  const [updated] = await database
    .update(user)
    .set({ onboardingCompletedAt: now, updatedAt: now })
    .where(and(eq(user.id, appUser.id), isNull(user.onboardingCompletedAt)))
    .returning({ onboardingCompletedAt: user.onboardingCompletedAt });

  if (updated?.onboardingCompletedAt) {
    return { onboardingCompletedAt: updated.onboardingCompletedAt };
  }

  const current = await database.query.user.findFirst({
    where: eq(user.id, appUser.id),
    columns: { onboardingCompletedAt: true },
  });

  if (!current?.onboardingCompletedAt) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to complete onboarding",
    });
  }

  return { onboardingCompletedAt: current.onboardingCompletedAt };
}

export const completeOnboarding = protectedProcedure.mutation(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markOnboardingComplete(ctx.db, { userId: appUser.id });
  },
);
