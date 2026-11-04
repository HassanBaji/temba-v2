import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  groupLevelOverrides,
  groupMembers,
  groupRatingEvents,
  groupRatings,
  groups,
  ratings,
  user,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { levelFromMu, type LevelBand } from "@repo/domain/level";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type GroupLevelRow = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  level: string;
  /** Group Level to two decimals, for the You page's rating face. */
  rating: number;
  levelBand: LevelBand;
  provisional: boolean;
  ratedMatchesRemaining: number;
  ratedMatchCount: number;
  /** Position among the Group's members with a Group Level, by Level. */
  rank: number;
  rankedCount: number;
  /** Group Level minus the Temba Level, in Level units; null without a Temba Level. */
  differenceFromGeneral: number | null;
  setBy: { name: string; at: Date } | null;
};

async function latestOverrides(
  database: DbClient,
  userId: string,
  groupIds: string[],
) {
  const rows = await database
    .select({
      groupId: groupLevelOverrides.groupId,
      createdAt: groupLevelOverrides.createdAt,
      setByName: user.name,
    })
    .from(groupLevelOverrides)
    .innerJoin(user, eq(user.id, groupLevelOverrides.setByUserId))
    .where(
      and(
        eq(groupLevelOverrides.userId, userId),
        inArray(groupLevelOverrides.groupId, groupIds),
      ),
    )
    .orderBy(desc(groupLevelOverrides.createdAt));
  const latest = new Map<string, { name: string; at: Date }>();
  for (const row of rows) {
    if (!latest.has(row.groupId)) {
      latest.set(row.groupId, { name: row.setByName, at: row.createdAt });
    }
  }
  return latest;
}

async function ratedCounts(
  database: DbClient,
  userId: string,
  groupIds: string[],
) {
  const rows = await database
    .select({ groupId: groupRatingEvents.groupId, value: count() })
    .from(groupRatingEvents)
    .where(
      and(
        eq(groupRatingEvents.userId, userId),
        inArray(groupRatingEvents.groupId, groupIds),
      ),
    )
    .groupBy(groupRatingEvents.groupId);
  return new Map(rows.map((row) => [row.groupId, Number(row.value)]));
}

/** Every current member's Group Level μ, per Group, for the rank. */
async function memberMus(database: DbClient, groupIds: string[]) {
  const rows = await database
    .select({ groupId: groupRatings.groupId, mu: groupRatings.mu })
    .from(groupRatings)
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groupRatings.groupId),
        eq(groupMembers.userId, groupRatings.userId),
      ),
    )
    .where(inArray(groupRatings.groupId, groupIds));
  const byGroup = new Map<string, number[]>();
  for (const row of rows) {
    byGroup.set(row.groupId, [...(byGroup.get(row.groupId) ?? []), row.mu]);
  }
  return byGroup;
}

/**
 * The signed-in User's Group Levels in one sport (ADR-0053), highest Level
 * first, for the You page's scope chips and "Levels by group". Only live
 * Groups of that sport the User still belongs to.
 */
export async function loadMyGroupLevels(
  database: DbClient,
  args: { userId: string; sport: Sport; now?: Date },
): Promise<GroupLevelRow[]> {
  const now = args.now ?? new Date();
  const rows = await database
    .select({
      rating: groupRatings,
      group: {
        id: groups.id,
        name: groups.name,
        imageUrl: groups.imageUrl,
        sport: groups.sport,
      },
    })
    .from(groupRatings)
    .innerJoin(groups, eq(groups.id, groupRatings.groupId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groupRatings.groupId),
        eq(groupMembers.userId, groupRatings.userId),
      ),
    )
    .where(and(eq(groupRatings.userId, args.userId), isNull(groups.deletedAt)));
  const mine = rows.filter(
    (row) => sportOrDefault(row.group.sport) === args.sport,
  );
  if (mine.length === 0) {
    return [];
  }

  const groupIds = mine.map((row) => row.group.id);
  const [overrides, counts, mus, temba] = await Promise.all([
    latestOverrides(database, args.userId, groupIds),
    ratedCounts(database, args.userId, groupIds),
    memberMus(database, groupIds),
    database.query.ratings.findFirst({
      where: and(
        eq(ratings.userId, args.userId),
        eq(
          ratings.sport,
          args.sport === "football"
            ? GroupSportEnum.FOOTBALL
            : GroupSportEnum.PADEL,
        ),
      ),
      columns: { mu: true },
    }),
  ]);

  return [...mine]
    .sort((left, right) => right.rating.mu - left.rating.mu)
    .map(({ rating, group }): GroupLevelRow => {
      const view = youRatingViewAfterIdle(rating, now);
      const groupMus = mus.get(group.id) ?? [rating.mu];
      return {
        groupId: group.id,
        name: group.name ?? "",
        imageUrl: group.imageUrl ?? null,
        level: view.level,
        rating: Math.round(levelFromMu(rating.mu) * 100) / 100,
        levelBand: view.levelBand,
        provisional: view.provisional,
        ratedMatchesRemaining: view.ratedMatchesRemaining,
        ratedMatchCount: counts.get(group.id) ?? 0,
        rank: 1 + groupMus.filter((mu) => mu > rating.mu).length,
        rankedCount: groupMus.length,
        differenceFromGeneral: temba
          ? Math.round((levelFromMu(rating.mu) - levelFromMu(temba.mu)) * 100) /
            100
          : null,
        setBy: overrides.get(group.id) ?? null,
      };
    });
}

export const myGroupLevels = protectedProcedure
  .input(z.object({ sport: sportSchema }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadMyGroupLevels(ctx.db, {
      userId: appUser.id,
      sport: input.sport,
    });
  });
