import { and, desc, eq, gte, lt, or } from "drizzle-orm";
import { z } from "zod";

import { notifications } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { notificationRetentionCutoff } from "#src/notifications/retention";

type DbClient = typeof db;

const DEFAULT_LIMIT = 20;

const listInput = z.object({
  cursor: z.object({ createdAt: z.date(), id: z.string().uuid() }).optional(),
  limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
});

type ListInput = z.input<typeof listInput>;

type NotificationPerson = {
  id: string;
  name: string;
  image: string | null;
};

function person(
  row: { id: string; name: string; image: string | null } | null,
): NotificationPerson | null {
  return row ? { id: row.id, name: row.name, image: row.image } : null;
}

export async function listNotifications(
  database: DbClient,
  args: { userId: string } & ListInput,
) {
  const limit = args.limit ?? DEFAULT_LIMIT;
  const { cursor } = args;

  const rows = await database.query.notifications.findMany({
    where: and(
      eq(notifications.recipientUserId, args.userId),
      gte(notifications.createdAt, notificationRetentionCutoff()),
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
    orderBy: [desc(notifications.createdAt), desc(notifications.id)],
    limit: limit + 1,
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

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? { createdAt: last.createdAt, id: last.id }
      : null;

  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      audience: row.audience,
      createdAt: row.createdAt,
      readAt: row.readAt,
      viaWaitlist: row.viaWaitlist,
      actor: person(row.actor),
      partner: person(row.partner),
      team: row.team,
      group: row.group,
      game: row.game,
    })),
    nextCursor,
  };
}

export const list = protectedProcedure
  .input(listInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listNotifications(ctx.db, { ...input, userId: appUser.id });
  });
