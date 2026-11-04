import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { SPORTS } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

/**
 * Adds or removes a sport from the User's profile. Removing hides it from the
 * You page; the Rating, Group Levels and results stay for when it comes back.
 */
export const setSports = protectedProcedure
  .input(z.object({ sports: z.array(sportSchema) }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    const sports = SPORTS.filter((sport) => input.sports.includes(sport));
    await ctx.db
      .update(user)
      .set({ sports, updatedAt: new Date() })
      .where(eq(user.id, appUser.id));
    return { sports };
  });
