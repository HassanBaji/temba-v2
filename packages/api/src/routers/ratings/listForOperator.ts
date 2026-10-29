import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  levelOverrides,
  ratingEvents,
  ratings,
  user,
  type DbClient,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  classifyLookupQuery,
  lookupUserTextFilter,
} from "#src/invites/search-lookup-users";
import { operatorProcedure } from "#src/trpc";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

export const OPERATOR_PLAYERS_PAGE_SIZE = 50;

/**
 * Every User with their Level in one sport, for an Operator to correct. A
 * User with no Rating in that sport has no Level yet and is listed anyway.
 */
export async function listForOperator(
  database: DbClient,
  args: {
    sport: Sport;
    operatorUserId: string;
    query?: string;
    cursor?: number;
    limit?: number;
    now?: Date;
  },
) {
  const sport =
    args.sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;
  const offset = args.cursor ?? 0;
  const limit = args.limit ?? OPERATOR_PLAYERS_PAGE_SIZE;
  const now = args.now ?? new Date();

  const rows = await database.query.user.findMany({
    where: lookupUserTextFilter(classifyLookupQuery(args.query ?? "")),
    columns: {
      id: true,
      name: true,
      username: true,
      image: true,
      clerkId: true,
      addedAt: true,
    },
    orderBy: [asc(user.name), asc(user.id)],
    limit: limit + 1,
    offset,
  });
  const page = rows.slice(0, limit);
  const userIds = page.map((row) => row.id);

  const [ratingRows, matchCountRows, overrideRows] =
    userIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          database.query.ratings.findMany({
            where: and(
              eq(ratings.sport, sport),
              inArray(ratings.userId, userIds),
            ),
          }),
          database
            .select({ userId: ratingEvents.userId, ratedMatchCount: count() })
            .from(ratingEvents)
            .where(
              and(
                eq(ratingEvents.sport, sport),
                inArray(ratingEvents.userId, userIds),
              ),
            )
            .groupBy(ratingEvents.userId),
          database
            .select({
              userId: levelOverrides.userId,
              setByUserId: levelOverrides.setByUserId,
              setByName: user.name,
              createdAt: levelOverrides.createdAt,
              reason: levelOverrides.reason,
            })
            .from(levelOverrides)
            .innerJoin(user, eq(user.id, levelOverrides.setByUserId))
            .where(
              and(
                eq(levelOverrides.sport, sport),
                inArray(levelOverrides.userId, userIds),
              ),
            )
            .orderBy(desc(levelOverrides.createdAt), desc(levelOverrides.id)),
        ]);

  const ratingByUserId = new Map(
    ratingRows.map((row) => [row.userId, youRatingViewAfterIdle(row, now)]),
  );
  const ratedMatchCountByUserId = new Map(
    matchCountRows.map((row) => [row.userId, Number(row.ratedMatchCount)]),
  );
  const latestOverrideByUserId = new Map<
    string,
    (typeof overrideRows)[number]
  >();
  for (const row of overrideRows) {
    if (!latestOverrideByUserId.has(row.userId)) {
      latestOverrideByUserId.set(row.userId, row);
    }
  }

  return {
    items: page.map((row) => {
      const rating = ratingByUserId.get(row.id);
      const override = latestOverrideByUserId.get(row.id);
      return {
        userId: row.id,
        name: row.name,
        username: row.username,
        image: row.image,
        unclaimed: isUnclaimed(row),
        isViewer: row.id === args.operatorUserId,
        level: rating?.level ?? null,
        levelBand: rating?.levelBand ?? null,
        levelProvisional: rating?.provisional ?? true,
        ratedMatchCount: ratedMatchCountByUserId.get(row.id) ?? 0,
        levelOverride: override
          ? {
              setByName: override.setByName,
              setByIsViewer: override.setByUserId === args.operatorUserId,
              createdAt: override.createdAt,
              reason: override.reason,
            }
          : null,
      };
    }),
    nextCursor: rows.length > limit ? offset + limit : undefined,
  };
}

export const listForOperatorProcedure = operatorProcedure
  .input(
    z.object({
      sport: sportSchema,
      query: z.string().trim().max(100).optional(),
      cursor: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return listForOperator(ctx.db, {
      ...input,
      operatorUserId: operator.id,
    });
  });
