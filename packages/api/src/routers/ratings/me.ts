import { and, count, eq } from "drizzle-orm";

import { GroupSportEnum, levelOverrides, ratingEvents, ratings } from "@repo/db";

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

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Recent Level changes (Rated Matches and sets) for the home sparkline. */
const HISTORY_CHANGE_LIMIT = 15;

async function padelLevelHistory(
  database: DbClient,
  userId: string,
): Promise<string[]> {
  const [events, overrides] = await Promise.all([
    database.query.ratingEvents.findMany({
      where: and(
        eq(ratingEvents.userId, userId),
        eq(ratingEvents.sport, GroupSportEnum.PADEL),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
      limit: HISTORY_CHANGE_LIMIT,
      columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
    }),
    database.query.levelOverrides.findMany({
      where: and(
        eq(levelOverrides.userId, userId),
        eq(levelOverrides.sport, GroupSportEnum.PADEL),
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

async function padelRatedMatchCount(
  database: DbClient,
  userId: string,
): Promise<number> {
  const [row] = await database
    .select({ ratedMatchCount: count() })
    .from(ratingEvents)
    .where(
      and(
        eq(ratingEvents.userId, userId),
        eq(ratingEvents.sport, GroupSportEnum.PADEL),
      ),
    );
  return Number(row?.ratedMatchCount ?? 0);
}

/**
 * Current padel Rating for the signed-in User. Idle RD inflation is applied
 * for display (not persisted). Returns product Level / Level band /
 * Provisional only — never raw Glicko μ/φ/σ. Also includes progress within
 * the current Level band, typical Rated Matches remaining while Provisional,
 * and recent Level history for the home sparkline.
 */
export async function loadRatingsMe(
  database: DbClient,
  args: { userId: string },
) {
  const row = await database.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, args.userId),
      eq(ratings.sport, GroupSportEnum.PADEL),
    ),
  });

  if (!row) {
    return {
      rating: null,
      canSelfDeclare: !(await userHasRatedMatch(
        database,
        args.userId,
        GroupSportEnum.PADEL,
      )),
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
  const [history, ratedMatchCount] = await Promise.all([
    padelLevelHistory(database, args.userId),
    padelRatedMatchCount(database, args.userId),
  ]);

  return {
    rating,
    canSelfDeclare: false,
    progressPercent: progress.progressPercent,
    nextBand: progress.nextBand,
    history,
    ratedMatchCount,
  };
}

export const me = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadRatingsMe(ctx.db, { userId: appUser.id });
});
