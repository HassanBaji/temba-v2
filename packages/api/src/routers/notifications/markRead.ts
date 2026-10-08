import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db;

const markReadInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/** Ids that belong to another User, or are already read, are skipped silently. */
export async function markNotificationsRead(
  database: DbClient,
  args: { userId: string; ids: string[]; now?: Date },
): Promise<{ updated: number }> {
  const updated = await database
    .update(notifications)
    .set({ readAt: args.now ?? new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, args.userId),
        inArray(notifications.id, args.ids),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return { updated: updated.length };
}

export const markRead = protectedProcedure
  .input(markReadInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markNotificationsRead(ctx.db, {
      userId: appUser.id,
      ids: input.ids,
    });
  });
