import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  levelOverrides,
  ratingEvents,
  ratings,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { userHasRatedMatch } from "#src/ratings/has-rated-match";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import {
  displayedLevelFromMu,
  levelFromMu,
  progressToNextBand,
  type LevelBand,
} from "@repo/domain/level";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Recent Level changes (Rated Matches and sets) for the home sparkline. */
const HISTORY_CHANGE_LIMIT = 15;

function ratingSport(sport: Sport): GroupSportEnum {
  return sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;
}

async function levelHistory(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
): Promise<string[]> {
  const [events, overrides] = await Promise.all([
    database.query.ratingEvents.findMany({
      where: and(
        eq(ratingEvents.userId, userId),
        eq(ratingEvents.sport, sport),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
      limit: HISTORY_CHANGE_LIMIT,
      columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
    }),
    database.query.levelOverrides.findMany({
      where: and(
        eq(levelOverrides.userId, userId),
        eq(levelOverrides.sport, sport),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
      limit: HISTORY_CHANGE_LIMIT,
      columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
    }),
  ]);

  const changes = [...events, ...overrides]
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(-HISTORY_CHANGE_LIMIT);

  const first = changes[0];
  if (!first) {
    return [];
  }

  return [
    displayedLevelFromMu(first.muBefore),
    ...changes.map((change) => displayedLevelFromMu(change.muAfter)),
  ];
}

async function ratedMatchCount(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
): Promise<number> {
  const [row] = await database
    .select({ ratedMatchCount: count() })
    .from(ratingEvents)
    .where(and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)));
  return Number(row?.ratedMatchCount ?? 0);
}

/**
 * Current Rating in one sport (padel unless asked) for the signed-in User. Idle RD inflation is applied
 * for display (not persisted). Returns product Level / Level band /
 * Provisional only — never raw Glicko μ/φ/σ. Also includes progress within
 * the current Level band, typical Rated Matches remaining while Provisional,
 * and recent Level history for the home sparkline.
 */
export async function loadRatingsMe(
  database: DbClient,
  args: { userId: string; sport?: Sport },
) {
  const sport = ratingSport(args.sport ?? "padel");
  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, args.userId), eq(ratings.sport, sport)),
  });

  if (!row) {
    return {
      rating: null,
      canSelfDeclare: !(await userHasRatedMatch(database, args.userId, sport)),
      progressPercent: null as number | null,
      nextBand: null as LevelBand | null,
      history: [] as string[],
      ratedMatchCount: 0,
    };
  }

  const rating = youRatingViewAfterIdle(row, new Date());
  // Idle inflation does not change μ; progress uses the same continuous Level
  // as the displayed product number.
  const progress = progressToNextBand(levelFromMu(row.mu), rating.levelBand);
  const [history, matchCount] = await Promise.all([
    levelHistory(database, args.userId, sport),
    ratedMatchCount(database, args.userId, sport),
  ]);

  return {
    rating,
    canSelfDeclare: false,
    progressPercent: progress.progressPercent,
    nextBand: progress.nextBand,
    history,
    ratedMatchCount: matchCount,
  };
}

export const me = protectedProcedure
  .input(z.object({ sport: sportSchema }).optional())
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadRatingsMe(ctx.db, { userId: appUser.id, sport: input?.sport });
  });
