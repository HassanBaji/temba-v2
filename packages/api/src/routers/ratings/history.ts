import { and, desc, eq, inArray, lt, or, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  groupTierEvents,
  groups,
  levelOverrides,
  matchGoals,
  performanceRatingResults,
  ratingEvents,
  venues,
} from "@repo/db";
import {
  RATING_HISTORY_LADDERS,
  type RatingHistoryItemData,
  type RatingHistoryLadder,
} from "@repo/domain/rating-history";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  ratingHistoryMatches,
  setsFromSideOf,
  setterNames,
  tierHistoryEntries,
} from "#src/ratings/rating-history-entries";

type DbClient = typeof db;

const DEFAULT_PAGE_SIZE = 20;

export type RatingHistoryCursor = { createdAt: Date; id: string };

type Keyed = { id: string; createdAt: Date };

/** Newest first; the id breaks a tie so a cursor never skips or repeats. */
function newestFirst(a: Keyed, b: Keyed) {
  return (
    b.createdAt.getTime() - a.createdAt.getTime() ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

function olderThan(
  columns: { createdAt: AnyPgColumn; id: AnyPgColumn },
  cursor: RatingHistoryCursor | undefined,
): SQL | undefined {
  if (!cursor) {
    return undefined;
  }
  return or(
    lt(columns.createdAt, cursor.createdAt),
    and(eq(columns.createdAt, cursor.createdAt), lt(columns.id, cursor.id)),
  );
}

function shows(ladder: RatingHistoryLadder, part: "level" | "tier") {
  return ladder === "all" || ladder === part;
}

/**
 * A User's own Rating history (screen 1c, ADR-0073): the union of their
 * Rated Matches (`rating_events`), Level overrides (`level_overrides`) and
 * tier Group moves (`group_tier_events`), newest first, keyset-paged across
 * all three. Manual changes carry who set them, by which door, the Venue a
 * Verifier calibrated from, the reason and the note. The Rank filter is
 * reserved for Official Rank and returns nothing. Only the caller's own.
 */
export async function ratingHistory(
  database: DbClient,
  args: {
    userId: string;
    sport?: Sport;
    ladder: RatingHistoryLadder;
    cursor?: RatingHistoryCursor;
    limit?: number;
  },
): Promise<{
  viewerUserId: string;
  entries: RatingHistoryItemData[];
  nextCursor: RatingHistoryCursor | null;
}> {
  const empty = { viewerUserId: args.userId, entries: [], nextCursor: null };
  if (args.ladder === "rank") {
    return empty;
  }
  const limit = args.limit ?? DEFAULT_PAGE_SIZE;
  const { cursor, sport, userId } = args;
  const level = shows(args.ladder, "level");
  const tier = shows(args.ladder, "tier") && sport !== "padel";

  const [events, overrides, tierRows] = await Promise.all([
    level
      ? database
          .select()
          .from(ratingEvents)
          .where(
            and(
              eq(ratingEvents.userId, userId),
              sport ? eq(ratingEvents.sport, sport) : undefined,
              olderThan(ratingEvents, cursor),
            ),
          )
          .orderBy(desc(ratingEvents.createdAt), desc(ratingEvents.id))
          .limit(limit + 1)
      : [],
    level
      ? database
          .select({ override: levelOverrides, venueName: venues.name })
          .from(levelOverrides)
          .leftJoin(venues, eq(venues.id, levelOverrides.venueId))
          .where(
            and(
              eq(levelOverrides.userId, userId),
              sport ? eq(levelOverrides.sport, sport) : undefined,
              olderThan(levelOverrides, cursor),
            ),
          )
          .orderBy(desc(levelOverrides.createdAt), desc(levelOverrides.id))
          .limit(limit + 1)
      : [],
    tier
      ? database
          .select({
            event: groupTierEvents,
            group: { id: groups.id, name: groups.name },
          })
          .from(groupTierEvents)
          .innerJoin(groups, eq(groups.id, groupTierEvents.groupId))
          .where(
            and(
              eq(groupTierEvents.userId, userId),
              sport ? eq(groups.sport, sport) : undefined,
              olderThan(groupTierEvents, cursor),
            ),
          )
          .orderBy(desc(groupTierEvents.createdAt), desc(groupTierEvents.id))
          .limit(limit + 1)
      : [],
  ]);

  type Row =
    | { source: "event"; id: string; createdAt: Date; row: (typeof events)[0] }
    | {
        source: "override";
        id: string;
        createdAt: Date;
        row: (typeof overrides)[0];
      }
    | {
        source: "tier";
        id: string;
        createdAt: Date;
        row: (typeof tierRows)[0];
      };
  const merged: Row[] = [
    ...events.map((row) => ({
      source: "event" as const,
      id: row.id,
      createdAt: row.createdAt,
      row,
    })),
    ...overrides.map((row) => ({
      source: "override" as const,
      id: row.override.id,
      createdAt: row.override.createdAt,
      row,
    })),
    ...tierRows.map((row) => ({
      source: "tier" as const,
      id: row.event.id,
      createdAt: row.event.createdAt,
      row,
    })),
  ].sort(newestFirst);
  const page = merged.slice(0, limit);
  const last = page.at(-1);

  const pageEvents = page.flatMap((entry) =>
    entry.source === "event" ? [entry.row] : [],
  );
  const pageOverrides = page.flatMap((entry) =>
    entry.source === "override" ? [entry.row] : [],
  );
  const pageTier = page.flatMap((entry) =>
    entry.source === "tier" ? [entry.row] : [],
  );
  const footballMatchIds = pageEvents.flatMap((event) =>
    event.sport === "football" ? [event.matchId] : [],
  );

  const [matchById, setterById, tierEntries, ratingByMatch, goalsByMatch] =
    await Promise.all([
      ratingHistoryMatches(
        database,
        pageEvents.map((event) => event.matchId),
      ),
      setterNames(
        database,
        pageOverrides.map((row) => row.override.setByUserId),
      ),
      tierHistoryEntries(
        database,
        userId,
        pageTier.flatMap((row) =>
          row.event.kind === "band_change" ? [] : [row.event],
        ),
      ),
      footballMatchIds.length === 0
        ? new Map<string, number>()
        : database
            .select({
              matchId: performanceRatingResults.matchId,
              ratingHundredths: performanceRatingResults.ratingHundredths,
            })
            .from(performanceRatingResults)
            .where(
              and(
                eq(performanceRatingResults.userId, userId),
                inArray(performanceRatingResults.matchId, footballMatchIds),
              ),
            )
            .then(
              (rows) =>
                new Map(rows.map((row) => [row.matchId, row.ratingHundredths])),
            ),
      footballMatchIds.length === 0
        ? new Map<string, number>()
        : database
            .select({ matchId: matchGoals.matchId, goals: matchGoals.goals })
            .from(matchGoals)
            .where(
              and(
                eq(matchGoals.userId, userId),
                inArray(matchGoals.matchId, footballMatchIds),
              ),
            )
            .then(
              (rows) => new Map(rows.map((row) => [row.matchId, row.goals])),
            ),
    ]);
  const tierEntryById = new Map(tierEntries.map((entry) => [entry.id, entry]));

  const entries = page.flatMap((entry): RatingHistoryItemData[] => {
    if (entry.source === "event") {
      const event = entry.row;
      const match = matchById.get(event.matchId);
      const game = match?.game;
      const votedMvp =
        game?.mvpSettledAt && game.mvpDecidedBy === "vote"
          ? game.mvpUserId
          : null;
      return [
        {
          kind: "level_match",
          id: event.id,
          at: event.createdAt,
          sport: event.sport,
          muBefore: event.muBefore,
          muAfter: event.muAfter,
          venueName: game?.venue?.name ?? null,
          sets: match ? setsFromSideOf(match, userId) : null,
          football:
            event.sport === "football"
              ? {
                  ratingHundredths: ratingByMatch.get(event.matchId) ?? null,
                  goals: goalsByMatch.get(event.matchId) ?? 0,
                  mvp: votedMvp === userId,
                }
              : null,
        },
      ];
    }
    if (entry.source === "override") {
      const { override, venueName } = entry.row;
      const setter = setterById.get(override.setByUserId);
      return [
        {
          kind: "level_override",
          id: override.id,
          at: override.createdAt,
          sport: override.sport,
          muBefore: override.muBefore,
          muAfter: override.muAfter,
          setByRole: override.setByRole,
          setBy: setter ? { userId: setter.id, name: setter.name } : null,
          venueName,
          reason: override.reason,
          note: override.note,
        },
      ];
    }
    const { event, group } = entry.row;
    if (event.kind === "band_change") {
      return [
        {
          kind: "tier_band",
          id: event.id,
          at: event.createdAt,
          group,
          bandBefore: event.bandBefore,
          bandAfter: event.bandAfter,
          place: event.placeAfter,
          rankedCount: event.rankedCount,
          points: event.pointsAfter,
        },
      ];
    }
    const tierEntry = tierEntryById.get(event.id);
    return tierEntry
      ? [{ ...tierEntry, group, band: event.bandAfter ?? event.bandBefore }]
      : [];
  });

  return {
    viewerUserId: userId,
    entries,
    nextCursor:
      merged.length > limit && last
        ? { createdAt: last.createdAt, id: last.id }
        : null,
  };
}

export const historyProcedure = protectedProcedure
  .input(
    z.object({
      sport: sportSchema.optional(),
      ladder: z.enum(RATING_HISTORY_LADDERS),
      cursor: z
        .object({ createdAt: z.date(), id: z.string().uuid() })
        .optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return ratingHistory(ctx.db, {
      userId: appUser.id,
      sport: input.sport,
      ladder: input.ladder,
      cursor: input.cursor,
      limit: input.limit,
    });
  });
