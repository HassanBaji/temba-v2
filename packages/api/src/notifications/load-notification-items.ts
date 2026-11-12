import type { DbClient } from "@repo/db";
import type { SQL } from "drizzle-orm";

import { type NotificationAudience, type NotificationType } from "@repo/db";
import { formatOvr, ovrFromMu } from "@repo/domain/football-ovr";
import { displayedLevelFromMu } from "@repo/domain/level";
import { type LevelBand } from "@repo/domain/level-bands";
import { type LevelOverrideReason } from "@repo/domain/level-slider";
import { marksWindow, type MarkKind } from "@repo/domain/marks";
import { type TierBand } from "@repo/domain/tier-bands";

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
  challenge: { id: string } | null;
  game: {
    id: string;
    name: string | null;
    format: string;
    sport: string | null;
    windowStart: Date | null;
    /** Set only while the Game's Marks window is open. */
    marksClosesAt: Date | null;
  } | null;
  markKind: MarkKind | null;
  /** The recipient is the actor, as on the MVP's own `mvp_decided` row. */
  actorIsRecipient: boolean;
  levelSet: {
    /** The set Level as its sport shows it: `3.2`, or OVR `72` on football. */
    level: string;
    levelBand: LevelBand;
    reason: LevelOverrideReason | null;
    note: string | null;
    /** The Venue a Verifier calibrated from; null on every other door. */
    venue: { id: string; name: string } | null;
  } | null;
  /** The Tier event a Tier or ratings-closed Notification is about. */
  tier: {
    bandAfter: TierBand | null;
    pointsBefore: number;
    pointsAfter: number;
    delta: number;
    /** The settled Performance rating, in hundredths; null without one. */
    ratingHundredths: number | null;
    reason: LevelOverrideReason | null;
    note: string | null;
  } | null;
};

export type LoadedNotification = {
  item: NotificationItem;
  recipientUserId: string;
  emailedAt: Date | null;
};

/** A Friendly game has one Match; its `completedAt` is set only while it is completed. */
function openMarksClosesAt(
  game: {
    format: string;
    cancelledAt: Date | null;
    matches: { completedAt: Date | null }[];
  },
  now: Date,
) {
  if (game.format !== "friendly_game" || game.cancelledAt) {
    return null;
  }
  const completedAt =
    game.matches.find((match) => match.completedAt)?.completedAt ?? null;
  const marks = marksWindow(completedAt, now);
  return marks?.state === "open" ? marks.closesAt : null;
}

/**
 * The one read behind the Notifications list and the Notification email, so
 * both channels join the same names at the same moment (ADR-0054). Newest first.
 */
export async function loadNotificationItems(
  database: DbClient,
  args: { where: SQL | undefined; limit: number; now?: Date },
): Promise<LoadedNotification[]> {
  const now = args.now ?? new Date();
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
      markKind: true,
    },
    with: {
      actor: { columns: { id: true, name: true, image: true } },
      partner: { columns: { id: true, name: true, image: true } },
      team: { columns: { id: true, name: true } },
      group: { columns: { id: true, name: true } },
      challenge: { columns: { id: true } },
      game: {
        columns: {
          id: true,
          name: true,
          format: true,
          sport: true,
          windowStart: true,
          cancelledAt: true,
        },
        with: { matches: { columns: { completedAt: true } } },
      },
      levelOverride: {
        columns: {
          sport: true,
          muAfter: true,
          levelBandAfter: true,
          reason: true,
          note: true,
        },
        with: { venue: { columns: { id: true, name: true } } },
      },
      groupTierEvent: {
        columns: {
          bandAfter: true,
          pointsBefore: true,
          pointsAfter: true,
          delta: true,
          ratingHundredths: true,
          reason: true,
          note: true,
        },
      },
    },
  });

  return rows.map(
    ({
      levelOverride,
      groupTierEvent,
      game,
      recipientUserId,
      emailedAt,
      ...item
    }) => ({
      recipientUserId,
      emailedAt,
      item: {
        ...item,
        actorIsRecipient: item.actor?.id === recipientUserId,
        game: game
          ? {
              id: game.id,
              name: game.name,
              format: game.format,
              sport: game.sport,
              windowStart: game.windowStart,
              marksClosesAt: openMarksClosesAt(game, now),
            }
          : null,
        levelSet: levelOverride
          ? {
              level:
                levelOverride.sport === "football"
                  ? formatOvr(ovrFromMu(levelOverride.muAfter))
                  : displayedLevelFromMu(levelOverride.muAfter),
              levelBand: levelOverride.levelBandAfter,
              reason: levelOverride.reason,
              note: levelOverride.note,
              venue: levelOverride.venue ?? null,
            }
          : null,
        tier: groupTierEvent ?? null,
      },
    }),
  );
}
