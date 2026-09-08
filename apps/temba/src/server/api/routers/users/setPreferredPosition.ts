import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { USER_PREFERRED_POSITION_VALUES, user } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type PreferredPosition = (typeof USER_PREFERRED_POSITION_VALUES)[number];

/** The door's accepted answers — the `user_preferred_position` enum itself. */
export const preferredPositionSchema = z.enum(USER_PREFERRED_POSITION_VALUES);

/**
 * Write the caller's Preferred Position — their standing preference for left
 * or right, or either. Freely re-callable: unlike the one-time Level
 * declaration this is a default the User may change whenever they like, so
 * there is no once-only rule and no refusal for an already-set value. Both
 * the Onboarding questionnaire and the You row call this.
 */
export async function writePreferredPosition(
  database: DbClient,
  args: { userId: string; preferredPosition: PreferredPosition },
) {
  const [updated] = await database
    .update(user)
    .set({
      preferredPosition: args.preferredPosition,
      updatedAt: new Date(),
    })
    .where(eq(user.id, args.userId))
    .returning({ preferredPosition: user.preferredPosition });

  if (!updated) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return { preferredPosition: updated.preferredPosition };
}

export const setPreferredPosition = protectedProcedure
  .input(z.object({ preferredPosition: preferredPositionSchema }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writePreferredPosition(ctx.db, {
      userId: appUser.id,
      preferredPosition: input.preferredPosition,
    });
  });
