import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Email notifications: whether the User receives Notification emails (ADR-0054). */
export async function writeEmailNotifications(
  database: DbClient,
  args: { userId: string; emailNotifications: boolean },
) {
  await database
    .update(user)
    .set({ emailNotifications: args.emailNotifications, updatedAt: new Date() })
    .where(eq(user.id, args.userId));
  return { emailNotifications: args.emailNotifications };
}

export const setEmailNotifications = protectedProcedure
  .input(z.object({ emailNotifications: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writeEmailNotifications(ctx.db, {
      userId: appUser.id,
      emailNotifications: input.emailNotifications,
    });
  });
