import type { DbClient } from "@repo/db";
import { and, count, eq, gte, isNull } from "drizzle-orm";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { notificationRetentionCutoff } from "#src/notifications/retention";

export async function countUnreadNotifications(
  database: DbClient,
  args: { userId: string; now?: Date },
): Promise<{ count: number }> {
  const [row] = await database
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, args.userId),
        isNull(notifications.readAt),
        gte(
          notifications.createdAt,
          notificationRetentionCutoff(args.now ?? new Date()),
        ),
      ),
    );
  return { count: Number(row?.count ?? 0) };
}

export const unreadCount = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return countUnreadNotifications(ctx.db, { userId: appUser.id });
});
