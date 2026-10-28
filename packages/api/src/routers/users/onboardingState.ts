import { and, eq } from "drizzle-orm";

import { GroupSportEnum, ratings, user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { userHasRatedMatch } from "#src/ratings/has-rated-match";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Onboarding questionnaire state for the caller: which questions are
 * answered, and whether the questionnaire is already behind them.
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
 * `sports`, the football preferences and `hasFootballRating` are what the
 * mobile questionnaire, which asks which sports the User plays, reads; a
 * null `sports` means the question has not been answered.
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
      sports: true,
      preferredPosition: true,
      preferredFootballRole: true,
      preferredFootballPosition: true,
      onboardingCompletedAt: true,
    },
  });

  if (!appUser) {
    return {
      provisioning: true as const,
      sports: null,
      preferredPosition: null,
      preferredFootballRole: null,
      preferredFootballPosition: null,
      onboardingCompletedAt: null,
      hasRating: false,
      hasFootballRating: false,
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
  const footballRating = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, appUser.id),
      eq(ratings.sport, GroupSportEnum.FOOTBALL),
    ),
    columns: { id: true },
  });

  return {
    provisioning: false as const,
    sports: appUser.sports,
    preferredPosition: appUser.preferredPosition,
    preferredFootballRole: appUser.preferredFootballRole,
    preferredFootballPosition: appUser.preferredFootballPosition,
    onboardingCompletedAt: appUser.onboardingCompletedAt,
    hasRating,
    hasFootballRating: footballRating != null,
    canSelfDeclare: hasRating
      ? false
      : !(await userHasRatedMatch(database, appUser.id, GroupSportEnum.PADEL)),
  };
}

export const onboardingState = protectedProcedure.query(({ ctx }) =>
  loadOnboardingState(ctx.db, { clerkId: ctx.userId }),
);
