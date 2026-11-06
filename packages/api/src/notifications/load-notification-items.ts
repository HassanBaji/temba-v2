import type { DbClient } from "@repo/db";
import type { SQL } from "drizzle-orm";

import { type NotificationAudience, type NotificationType } from "@repo/db";
import { displayedLevelFromMu } from "@repo/domain/level";
import { type LevelBand } from "@repo/domain/level-bands";
import { type LevelOverrideReason } from "@repo/domain/level-slider";

type NotificationPerson = { id: string; name: string; image: string | null };

/** Clients must ignore a `type` or `audience` they do not recognise. */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  audience: NotificationAudience;
  createdAt: Date;
  readAt: Date | null;
  viaWaitlist: boolean;
  gameCount: number | null;
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
  levelSet: {
    level: string;
    levelBand: LevelBand;
    reason: LevelOverrideReason | null;
  } | null;
};

export type LoadedNotification = {
  item: NotificationItem;
  recipientUserId: string;
  emailedAt: Date | null;
};

/**
 * The one read behind the Notifications list and the Notification email, so
 * both channels join the same names at the same moment (ADR-0054). Newest first.
 */
export async function loadNotificationItems(
  database: DbClient,
  args: { where: SQL | undefined; limit: number },
): Promise<LoadedNotification[]> {
  const rows = await database.query.notifications.findMany({
    where: args.where,
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    limit: args.limit,
    columns: {
      id: true,
      recipientUserId: true,
      type: true,
      audience: true,
      createdAt: true,
      readAt: true,
      emailedAt: true,
      viaWaitlist: true,
      gameCount: true,
    },
    with: {
      actor: { columns: { id: true, name: true, image: true } },
      partner: { columns: { id: true, name: true, image: true } },
      team: { columns: { id: true, name: true } },
      group: { columns: { id: true, name: true } },
      game: {
        columns: { id: true, name: true, format: true, windowStart: true },
      },
      levelOverride: {
        columns: { muAfter: true, levelBandAfter: true, reason: true },
      },
    },
  });

  return rows.map(({ levelOverride, recipientUserId, emailedAt, ...item }) => ({
    recipientUserId,
    emailedAt,
    item: {
      ...item,
      levelSet: levelOverride
        ? {
            level: displayedLevelFromMu(levelOverride.muAfter),
            levelBand: levelOverride.levelBandAfter,
            reason: levelOverride.reason,
          }
        : null,
    },
  }));
}
