import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { ratings, user } from "@repo/db";
import { SELF_DECLARE_CHOICES } from "@repo/domain/level-bands";
import { type Sport } from "@repo/domain/sport";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { userHasRatedMatch } from "#src/ratings/has-rated-match";
import { selfDeclareRating } from "#src/routers/ratings/selfDeclare";
import { preferredPositionSchema } from "#src/routers/users/setPreferredPosition";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const selfDeclareChoiceSchema = z.enum(SELF_DECLARE_CHOICES);

export const onboardingAnswersSchema = z
  .object({
    sports: z.array(sportSchema).min(1),
    padel: z
      .object({
        preferredPosition: preferredPositionSchema,
        choice: selfDeclareChoiceSchema,
      })
      .optional(),
    football: z
      .object({
        role: footballRoleSchema,
        position: footballPositionSchema.nullable(),
        choice: selfDeclareChoiceSchema,
      })
      .optional(),
  })
  .superRefine((answers, ctx) => {
    for (const sport of ["padel", "football"] as const) {
      if (answers.sports.includes(sport) && !answers[sport]) {
        ctx.addIssue({
          code: "custom",
          path: [sport],
          message: `Answer the ${sport} questions first`,
        });
      }
    }
  });

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;

async function hasRating(database: DbClient, userId: string, sport: Sport) {
  const rating = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
    columns: { id: true },
  });
  return rating != null;
}

/**
 * Mark the Onboarding questionnaire done for the caller.
 *
 * What must be answered depends on the sports the User plays. Padel needs a
 * Preferred Position on `user` and a padel Rating row, which only
 * `ratings.selfDeclare` (or a Rated Match) creates. Football needs a
 * preferred Football role and a football Rating row. A User with no `sports`
 * onboarded before the question existed and is read as padel only. Anything
 * missing is refused with `PRECONDITION_FAILED` and nothing is written, so
 * the questionnaire cannot be completed past a step.
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
      sports: true,
      preferredPosition: true,
      preferredFootballRole: true,
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

  const sports: Sport[] = appUser.sports ?? ["padel"];

  if (sports.includes("padel")) {
    if (!appUser.preferredPosition) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Choose a Preferred Position first",
      });
    }
    if (!(await hasRating(database, appUser.id, "padel"))) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Declare a Level first",
      });
    }
  }

  if (sports.includes("football")) {
    if (!appUser.preferredFootballRole) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Choose how you line up in football first",
      });
    }
    if (!(await hasRating(database, appUser.id, "football"))) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Declare a football Level first",
      });
    }
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

/**
 * Save every onboarding answer and complete onboarding in one transaction,
 * so a failed step leaves nothing half written. A sport that already has a
 * Rating, or a Rated Match, keeps it: the one-time declare is skipped rather
 * than refused, so a retry after a partial web onboarding still finishes.
 */
export async function submitOnboarding(
  database: typeof db,
  args: { userId: string; answers: OnboardingAnswers },
) {
  const { userId, answers } = args;
  const sports = [...new Set(answers.sports)];
  const padel = sports.includes("padel") ? answers.padel : undefined;
  const football = sports.includes("football") ? answers.football : undefined;

  return database.transaction(async (tx) => {
    const existing = await tx.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { onboardingCompletedAt: true },
    });
    if (existing?.onboardingCompletedAt) {
      return { onboardingCompletedAt: existing.onboardingCompletedAt };
    }

    await tx
      .update(user)
      .set({
        sports,
        ...(padel ? { preferredPosition: padel.preferredPosition } : {}),
        ...(football
          ? {
              preferredFootballRole: football.role,
              preferredFootballPosition: football.position,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    for (const [sport, choice] of [
      ["padel", padel?.choice],
      ["football", football?.choice],
    ] as const) {
      if (
        choice &&
        !(await hasRating(tx, userId, sport)) &&
        !(await userHasRatedMatch(tx, userId, sport))
      ) {
        await selfDeclareRating(tx, userId, sport, choice);
      }
    }

    return markOnboardingComplete(tx, { userId });
  });
}

export const completeOnboarding = protectedProcedure
  .input(onboardingAnswersSchema.optional())
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    if (input) {
      return submitOnboarding(ctx.db, { userId: appUser.id, answers: input });
    }
    return markOnboardingComplete(ctx.db, { userId: appUser.id });
  });
