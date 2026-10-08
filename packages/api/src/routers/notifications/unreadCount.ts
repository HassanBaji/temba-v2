import { and, count, eq, gte, isNull } from "drizzle-orm";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notificationRetentionCutoff } from "#src/notifications/retention";

type DbClient = typeof db;

export async function unreadNotificationCount(
  database: DbClient,
  args: { userId: string },
) {
  const [row] = await database
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, args.userId),
        isNull(notifications.readAt),
        gte(notifications.createdAt, notificationRetentionCutoff()),
      ),
    );
  return { count: row?.count ?? 0 };
}

export const unreadCount = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return unreadNotificationCount(ctx.db, { userId: appUser.id });
});
