import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { MATCH_HISTORY_VISIBILITIES } from "@repo/domain/profile-details";

export const setMatchHistoryVisibility = protectedProcedure
  .input(z.object({ visibility: z.enum(MATCH_HISTORY_VISIBILITIES) }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    await ctx.db
      .update(user)
      .set({ matchHistoryVisibility: input.visibility, updatedAt: new Date() })
      .where(eq(user.id, appUser.id));
    return { visibility: input.visibility };
  });
