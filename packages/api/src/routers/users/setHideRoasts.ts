import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The owner leaves their Roasts out of the cabinet other viewers see, or shows them again. */
export async function setHideRoasts(
  database: DbClient,
  args: { userId: string; hide: boolean },
) {
  await database
    .update(user)
    .set({ hideRoasts: args.hide, updatedAt: new Date() })
    .where(eq(user.id, args.userId));
  return { hideRoasts: args.hide };
}

export const setHideRoastsProcedure = protectedProcedure
  .input(z.object({ hide: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setHideRoasts(ctx.db, { userId: appUser.id, hide: input.hide });
  });
