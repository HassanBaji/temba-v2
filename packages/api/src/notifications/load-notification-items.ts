import type { DbClient } from "@repo/db";
import { and, eq, inArray, type SQL } from "drizzle-orm";

import {
  kingPlaceAwards,
  performanceRatingResults,
  ratingEvents,
  type MatchDisputeStatus,
  type NotificationAudience,
  type NotificationType,
} from "@repo/db";
import { formatOvr, ovrFromMu } from "@repo/domain/football-ovr";
import {
  displayedLevelFromMu,
  formatPadelLevel,
  levelFromMu,
} from "@repo/domain/level";
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
  /**
   * The OVR move a ratings-closed Notification is about, on a Match that
   * counts for Temba Level; null on a tier Match, and once it is reversed.
   */
  ovrMove: {
    before: number;
    after: number;
    /** The settled Performance rating, in hundredths; null without one. */
    ratingHundredths: number | null;
  } | null;
  /** The Place award a King of the court Notification is about (ADR-0089). */
  placeAward: {
    finalPlace: number;
    /** The Level either side of it, as padel shows it, two decimals. */
    levelBefore: string;
    levelAfter: string;
  } | null;
  /** The Match dispute a raised or decided Notification is about. */
  dispute: { status: MatchDisputeStatus; note: string } | null;
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
 * The OVR move and settled rating of each User on each Match, read from the
 * Match's rating events: what a ratings-closed Notification says on a Match
 * that counts for Temba Level. A reversed Match has none.
 */
async function levelRatingsClosedMoves(
  database: DbClient,
  pairs: readonly { userId: string; matchId: string }[],
) {
  const moves = new Map<string, NonNullable<NotificationItem["ovrMove"]>>();
  const key = (userId: string, matchId: string) => `${userId}:${matchId}`;
  if (pairs.length > 0) {
    const userIds = [...new Set(pairs.map((pair) => pair.userId))];
    const matchIds = [...new Set(pairs.map((pair) => pair.matchId))];
    const [events, results] = await Promise.all([
      database
        .select({
          userId: ratingEvents.userId,
          matchId: ratingEvents.matchId,
          muBefore: ratingEvents.muBefore,
          muAfter: ratingEvents.muAfter,
        })
        .from(ratingEvents)
        .where(
          and(
            eq(ratingEvents.sport, "football"),
            inArray(ratingEvents.userId, userIds),
            inArray(ratingEvents.matchId, matchIds),
          ),
        ),
      database
        .select({
          userId: performanceRatingResults.userId,
          matchId: performanceRatingResults.matchId,
          ratingHundredths: performanceRatingResults.ratingHundredths,
        })
        .from(performanceRatingResults)
        .where(
          and(
            inArray(performanceRatingResults.userId, userIds),
            inArray(performanceRatingResults.matchId, matchIds),
          ),
        ),
    ]);
    const ratingOf = new Map(
      results.map((row) => [
        key(row.userId, row.matchId),
        row.ratingHundredths,
      ]),
    );
    for (const event of events) {
      moves.set(key(event.userId, event.matchId), {
        before: ovrFromMu(event.muBefore),
        after: ovrFromMu(event.muAfter),
        ratingHundredths:
          ratingOf.get(key(event.userId, event.matchId)) ?? null,
      });
    }
  }
  return (userId: string, matchId: string) =>
    moves.get(key(userId, matchId)) ?? null;
}

/** Each User's Place award on each King of the court Game. */
async function placeAwardsOf(
  database: DbClient,
  pairs: readonly { userId: string; gameId: string }[],
) {
  const awards = new Map<string, NonNullable<NotificationItem["placeAward"]>>();
  const key = (userId: string, gameId: string) => `${userId}:${gameId}`;
  if (pairs.length > 0) {
    const rows = await database
      .select({
        userId: kingPlaceAwards.userId,
        gameId: kingPlaceAwards.gameId,
        finalPlace: kingPlaceAwards.finalPlace,
        muBefore: kingPlaceAwards.muBefore,
        muAfter: kingPlaceAwards.muAfter,
      })
      .from(kingPlaceAwards)
      .where(
        and(
          inArray(kingPlaceAwards.userId, [
            ...new Set(pairs.map((pair) => pair.userId)),
          ]),
          inArray(kingPlaceAwards.gameId, [
            ...new Set(pairs.map((pair) => pair.gameId)),
          ]),
        ),
      );
    for (const row of rows) {
      awards.set(key(row.userId, row.gameId), {
        finalPlace: row.finalPlace,
        levelBefore: formatPadelLevel(levelFromMu(row.muBefore), 2),
        levelAfter: formatPadelLevel(levelFromMu(row.muAfter), 2),
      });
    }
  }
  return (userId: string, gameId: string) =>
    awards.get(key(userId, gameId)) ?? null;
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
        with: { matches: { columns: { id: true, completedAt: true } } },
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
      matchDispute: { columns: { status: true, note: true } },
    },
  });

  const ovrMoveOf = await levelRatingsClosedMoves(
    database,
    rows.flatMap((row) =>
      row.type === "performance_ratings_closed" &&
      row.game &&
      !row.groupTierEvent
        ? row.game.matches.map((match) => ({
            userId: row.recipientUserId,
            matchId: match.id,
          }))
        : [],
    ),
  );

  const placeAwardOf = await placeAwardsOf(
    database,
    rows.flatMap((row) =>
      row.type === "king_place_awarded" && row.game
        ? [{ userId: row.recipientUserId, gameId: row.game.id }]
        : [],
    ),
  );

  return rows.map(
    ({
      levelOverride,
      groupTierEvent,
      matchDispute,
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
              sport: levelOverride.sport,
              reason: levelOverride.reason,
              note: levelOverride.note,
              venue: levelOverride.venue ?? null,
            }
          : null,
        tier: groupTierEvent ?? null,
        ovrMove:
          item.type === "performance_ratings_closed" && game && !groupTierEvent
            ? (game.matches.flatMap((match) => {
                const move = ovrMoveOf(recipientUserId, match.id);
                return move ? [move] : [];
              })[0] ?? null)
            : null,
        placeAward:
          item.type === "king_place_awarded" && game
            ? placeAwardOf(recipientUserId, game.id)
            : null,
        dispute: matchDispute ?? null,
      },
    }),
  );
}
