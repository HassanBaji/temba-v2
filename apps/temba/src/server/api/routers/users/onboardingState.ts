import { and, eq } from "drizzle-orm";

import { GroupSportEnum, ratings, user } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { userHasRatedMatch } from "~/server/ratings/has-rated-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Onboarding questionnaire state for the caller: which of the two questions
 * are answered, and whether the questionnaire is already behind them.
 *
 * Four shapes:
 * - no `user` row for the clerkId yet (the Clerk `user.created` webhook has
 *   not landed) → `provisioning: true`, so the questionnaire can show a wait
 *   state instead of surfacing `UNAUTHORIZED`. That race is why this door
 *   reads `clerkId` directly instead of going through `resolveAppUser`.
 * - Preferred Position unset → step one
 * - Preferred Position set, no padel Rating → step two
 * - both answered → `onboardingCompletedAt` is non-null once
 *   `users.completeOnboarding` has run. Users backfilled by the migration are
 *   complete with a null Preferred Position and never see the questionnaire.
 *
 * `canSelfDeclare` mirrors `ratings.me`: a padel Rating row or a Rated Match
 * closes the one-time declare door. Nothing here declares a Level — that stays
 * `ratings.selfDeclare`.
 */
export async function loadOnboardingState(
  database: DbClient,
  args: { clerkId: string },
) {
  const appUser = await database.query.user.findFirst({
    where: eq(user.clerkId, args.clerkId),
    columns: {
      id: true,
      preferredPosition: true,
      onboardingCompletedAt: true,
    },
  });

  if (!appUser) {
    return {
      provisioning: true as const,
      preferredPosition: null,
      onboardingCompletedAt: null,
      hasRating: false,
      canSelfDeclare: false,
    };
  }

  const rating = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, appUser.id),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
    columns: { id: true },
  });
  const hasRating = rating != null;

  return {
    provisioning: false as const,
    preferredPosition: appUser.preferredPosition,
    onboardingCompletedAt: appUser.onboardingCompletedAt,
    hasRating,
    canSelfDeclare: hasRating
      ? false
      : !(await userHasRatedMatch(database, appUser.id, GroupSportEnum.PADEL)),
  };
}

export const onboardingState = protectedProcedure.query(({ ctx }) =>
  loadOnboardingState(ctx.db, { clerkId: ctx.userId }),
);
