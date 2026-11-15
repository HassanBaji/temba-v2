import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  groupTierEvents,
  groups,
  kingPlaceAwards,
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
import { votedMvpUserId } from "#src/marks/settle-mvp";
import { levelConfirmations } from "#src/ratings/level-confirmed";
import { olderThanShown, shownAt, shownAtIso } from "#src/ratings/shown-at";
import {
  kingPlaceGames,
  ratingHistoryMatches,
  setsFromSideOf,
  setterNames,
  tierHistoryEntries,
} from "#src/ratings/rating-history-entries";

type DbClient = typeof db;

const DEFAULT_PAGE_SIZE = 20;

/**
 * Where a page ended. `milestone` marks a "Level confirmed" line, which sits
 * just before the Rated Match it is derived from, so that Match is still to
 * come.
 */
export type RatingHistoryCursor = {
  createdAt: Date;
  id: string;
  milestone?: boolean;
};

type Keyed = { id: string; createdAt: Date; milestone: boolean };

/**
 * Newest first; the id breaks a tie so a cursor never skips or repeats, and
 * a milestone comes just before the Match it is derived from.
 */
function newestFirst(a: Keyed, b: Keyed) {
  return (
    b.createdAt.getTime() - a.createdAt.getTime() ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) ||
    Number(b.milestone) - Number(a.milestone)
  );
}

function afterCursor(entry: Keyed, cursor: RatingHistoryCursor | undefined) {
  return (
    !cursor ||
    newestFirst(
      {
        id: cursor.id,
        createdAt: cursor.createdAt,
        milestone: cursor.milestone ?? false,
      },
      entry,
    ) < 0
  );
}

function shows(ladder: RatingHistoryLadder, part: "level" | "tier") {
  return ladder === "all" || ladder === part;
}

/**
 * A User's own Rating history (ADR-0073): the union of their
 * Rated Matches (`rating_events`), Level overrides (`level_overrides`),
 * King of the court Place awards (`king_place_awards`, ADR-0089) and tier
 * Group moves (`group_tier_events`), newest first, keyset-paged across all
 * four. Manual changes carry who set them, by which door, the Venue a
 * Verifier calibrated from, the reason and the note. A derived "Level
 * confirmed" milestone sits just before the Match that confirmed each sport's
 * Level, and a change of fish is its own line, whoever caused it. The Rank
 * filter is reserved for Official Rank and returns nothing. Only the
 * caller's own.
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

  const [confirmations, events, overrides, awards, tierRows] =
    await Promise.all([
      level ? levelConfirmations(database, { userIds: [userId], sport }) : [],
      level
        ? database
            .select({
              event: ratingEvents,
              shownAt: shownAtIso(ratingEvents.createdAt),
            })
            .from(ratingEvents)
            .where(
              and(
                eq(ratingEvents.userId, userId),
                sport ? eq(ratingEvents.sport, sport) : undefined,
                olderThanShown(ratingEvents, cursor, cursor?.milestone),
              ),
            )
            .orderBy(
              desc(shownAt(ratingEvents.createdAt)),
              desc(ratingEvents.id),
            )
            .limit(limit + 1)
        : [],
      level
        ? database
            .select({
              override: levelOverrides,
              venueName: venues.name,
              shownAt: shownAtIso(levelOverrides.createdAt),
            })
            .from(levelOverrides)
            .leftJoin(venues, eq(venues.id, levelOverrides.venueId))
            .where(
              and(
                eq(levelOverrides.userId, userId),
                sport ? eq(levelOverrides.sport, sport) : undefined,
                olderThanShown(levelOverrides, cursor),
              ),
            )
            .orderBy(
              desc(shownAt(levelOverrides.createdAt)),
              desc(levelOverrides.id),
            )
            .limit(limit + 1)
        : [],
      level
        ? database
            .select({
              award: kingPlaceAwards,
              shownAt: shownAtIso(kingPlaceAwards.createdAt),
            })
            .from(kingPlaceAwards)
            .where(
              and(
                eq(kingPlaceAwards.userId, userId),
                sport ? eq(kingPlaceAwards.sport, sport) : undefined,
                olderThanShown(kingPlaceAwards, cursor),
              ),
            )
            .orderBy(
              desc(shownAt(kingPlaceAwards.createdAt)),
              desc(kingPlaceAwards.id),
            )
            .limit(limit + 1)
        : [],
      tier
        ? database
            .select({
              event: groupTierEvents,
              group: { id: groups.id, name: groups.name },
              shownAt: shownAtIso(groupTierEvents.createdAt),
            })
            .from(groupTierEvents)
            .innerJoin(groups, eq(groups.id, groupTierEvents.groupId))
            .where(
              and(
                eq(groupTierEvents.userId, userId),
                sport ? eq(groups.sport, sport) : undefined,
                olderThanShown(groupTierEvents, cursor),
              ),
            )
            .orderBy(
              desc(shownAt(groupTierEvents.createdAt)),
              desc(groupTierEvents.id),
            )
            .limit(limit + 1)
        : [],
    ]);

  const confirmationByEvent = new Map(
    confirmations.map((row) => [row.eventId, row]),
  );
  type Row = Keyed &
    (
      | { source: "event"; row: (typeof events)[0] }
      | { source: "confirmed"; row: (typeof confirmations)[0] }
      | { source: "override"; row: (typeof overrides)[0] }
      | { source: "award"; row: (typeof awards)[0] }
      | { source: "tier"; row: (typeof tierRows)[0] }
    );
  const merged: Row[] = [
    ...events.flatMap((row): Row[] => {
      const createdAt = new Date(row.shownAt);
      const event: Row = {
        source: "event",
        id: row.event.id,
        createdAt,
        milestone: false,
        row,
      };
      const confirmation = confirmationByEvent.get(row.event.id);
      return confirmation
        ? [
            {
              source: "confirmed",
              id: row.event.id,
              createdAt,
              milestone: true,
              row: confirmation,
            },
            event,
          ]
        : [event];
    }),
    ...overrides.map(
      (row): Row => ({
        source: "override",
        id: row.override.id,
        createdAt: new Date(row.shownAt),
        milestone: false,
        row,
      }),
    ),
    ...awards.map(
      (row): Row => ({
        source: "award",
        id: row.award.id,
        createdAt: new Date(row.shownAt),
        milestone: false,
        row,
      }),
    ),
    ...tierRows.map(
      (row): Row => ({
        source: "tier",
        id: row.event.id,
        createdAt: new Date(row.shownAt),
        milestone: false,
        row,
      }),
    ),
  ]
    .filter((entry) => afterCursor(entry, cursor))
    .sort(newestFirst);
  const page = merged.slice(0, limit);
  const last = page.at(-1);

  const pageEvents = page.flatMap((entry) =>
    entry.source === "event" ? [entry.row.event] : [],
  );
  const pageOverrides = page.flatMap((entry) =>
    entry.source === "override" ? [entry.row] : [],
  );
  const pageAwards = page.flatMap((entry) =>
    entry.source === "award" ? [entry.row.award] : [],
  );
  const pageTier = page.flatMap((entry) =>
    entry.source === "tier" ? [entry.row] : [],
  );
  const footballMatchIds = pageEvents.flatMap((event) =>
    event.sport === "football" ? [event.matchId] : [],
  );

  const [
    matchById,
    setterById,
    kingGameById,
    tierEntries,
    ratingByMatch,
    goalsByMatch,
  ] = await Promise.all([
    ratingHistoryMatches(
      database,
      pageEvents.map((event) => event.matchId),
    ),
    setterNames(
      database,
      pageOverrides.map((row) => row.override.setByUserId),
    ),
    kingPlaceGames(
      database,
      pageAwards.map((award) => award.gameId),
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
          .then((rows) => new Map(rows.map((row) => [row.matchId, row.goals]))),
  ]);
  const tierEntryById = new Map(tierEntries.map((entry) => [entry.id, entry]));

  const entries = page.flatMap((entry): RatingHistoryItemData[] => {
    if (entry.source === "confirmed") {
      const { row } = entry;
      return [
        {
          kind: "level_confirmed",
          id: row.eventId,
          at: entry.createdAt,
          sport: row.sport,
          muAfter: row.muAfter,
          matchesCounted: row.matchesCounted,
        },
      ];
    }
    if (entry.source === "event") {
      const { event } = entry.row;
      const match = matchById.get(event.matchId);
      const game = match?.game;
      const votedMvp = votedMvpUserId(game);
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
                  ratingHundredths:
                    event.performancePart == null
                      ? null
                      : (ratingByMatch.get(event.matchId) ?? null),
                  goals:
                    event.goalsPart == null
                      ? 0
                      : (goalsByMatch.get(event.matchId) ?? 0),
                  mvp: event.mvpPart != null && votedMvp === userId,
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
    if (entry.source === "award") {
      const { award } = entry.row;
      const game = kingGameById.get(award.gameId);
      return [
        {
          kind: "king_place",
          id: award.id,
          at: award.createdAt,
          sport: award.sport,
          muBefore: award.muBefore,
          muAfter: award.muAfter,
          venueName: game?.venueName ?? null,
          finalPlace: award.finalPlace,
          teamCount: game?.teamCount ?? 0,
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
          memberCount: event.memberCount,
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
        ? {
            createdAt: last.createdAt,
            id: last.id,
            ...(last.milestone ? { milestone: true } : {}),
          }
        : null,
  };
}

export const historyProcedure = protectedProcedure
  .input(
    z.object({
      sport: sportSchema.optional(),
      ladder: z.enum(RATING_HISTORY_LADDERS),
      cursor: z
        .object({
          createdAt: z.date(),
          id: z.string().uuid(),
          milestone: z.boolean().optional(),
        })
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
