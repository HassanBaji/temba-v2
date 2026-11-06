import type { DbClient } from "@repo/db";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { z } from "zod";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadNotificationItems,
  type NotificationItem,
} from "#src/notifications/load-notification-items";
import { notificationRetentionCutoff } from "#src/notifications/retention";

const DEFAULT_PAGE_SIZE = 20;

const listInput = z
  .object({
    cursor: z.object({ createdAt: z.date(), id: z.string().uuid() }).optional(),
    limit: z.number().int().min(1).max(50).default(DEFAULT_PAGE_SIZE),
  })
  .optional();

export type NotificationCursor = { createdAt: Date; id: string };

export type { NotificationItem };

export async function listNotifications(
  database: DbClient,
  args: {
    userId: string;
    cursor?: NotificationCursor;
    limit?: number;
    now?: Date;
  },
): Promise<{
  items: NotificationItem[];
  nextCursor: NotificationCursor | null;
}> {
  const limit = args.limit ?? DEFAULT_PAGE_SIZE;
  const cutoff = notificationRetentionCutoff(args.now ?? new Date());
  const { cursor } = args;

  const rows = await loadNotificationItems(database, {
    where: and(
      eq(notifications.recipientUserId, args.userId),
      gte(notifications.createdAt, cutoff),
      cursor
        ? or(
            lt(notifications.createdAt, cursor.createdAt),
            and(
              eq(notifications.createdAt, cursor.createdAt),
              lt(notifications.id, cursor.id),
            ),
          )
        : undefined,
    ),
    limit: limit + 1,
  });

  const items = rows.slice(0, limit).map((row) => row.item);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? { createdAt: last.createdAt, id: last.id }
        : null,
  };
}

export const list = protectedProcedure
  .input(listInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listNotifications(ctx.db, {
      userId: appUser.id,
      cursor: input?.cursor,
      limit: input?.limit,
    });
  });
