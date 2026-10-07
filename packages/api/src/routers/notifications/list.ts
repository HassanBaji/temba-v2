import type { DbClient } from "@repo/db";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { z } from "zod";

import {
  notifications,
  type NotificationAudience,
  type NotificationType,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { notificationRetentionCutoff } from "#src/notifications/retention";

const DEFAULT_PAGE_SIZE = 20;

const listInput = z
  .object({
    cursor: z.object({ createdAt: z.date(), id: z.string().uuid() }).optional(),
    limit: z.number().int().min(1).max(50).default(DEFAULT_PAGE_SIZE),
  })
  .optional();

type NotificationPerson = { id: string; name: string; image: string | null };

export type NotificationCursor = { createdAt: Date; id: string };

/** Clients must ignore a `type` or `audience` they do not recognise. */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  audience: NotificationAudience;
  createdAt: Date;
  readAt: Date | null;
  viaWaitlist: boolean;
  actor: NotificationPerson | null;
  partner: NotificationPerson | null;
  team: { id: string; name: string | null } | null;
  group: { id: string; name: string | null } | null;
  game: {
    id: string;
    name: string | null;
    format: string;
    windowStart: Date | null;
  } | null;
};

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

  const rows = await database.query.notifications.findMany({
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
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    limit: limit + 1,
    columns: {
      id: true,
      type: true,
      audience: true,
      createdAt: true,
      readAt: true,
      viaWaitlist: true,
    },
    with: {
      actor: { columns: { id: true, name: true, image: true } },
      partner: { columns: { id: true, name: true, image: true } },
      team: { columns: { id: true, name: true } },
      group: { columns: { id: true, name: true } },
      game: {
        columns: { id: true, name: true, format: true, windowStart: true },
      },
    },
  });

  const items = rows.slice(0, limit);
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
