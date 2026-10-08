import { and, eq, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db;

const markAllReadInput = z.object({ upTo: z.date() });

/**
 * `upTo` is the newest `createdAt` the client has loaded, so a Notification
 * that arrived after the client last fetched stays unread.
 */
export async function markAllNotificationsRead(
  database: DbClient,
  args: { userId: string; upTo: Date; now?: Date },
): Promise<{ updated: number }> {
  const updated = await database
    .update(notifications)
    .set({ readAt: args.now ?? new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, args.userId),
        isNull(notifications.readAt),
        lte(notifications.createdAt, args.upTo),
      ),
    )
    .returning({ id: notifications.id });
  return { updated: updated.length };
}

export const markAllRead = protectedProcedure
  .input(markAllReadInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markAllNotificationsRead(ctx.db, {
      userId: appUser.id,
      upTo: input.upTo,
    });
  });
