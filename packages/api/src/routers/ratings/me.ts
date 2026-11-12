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
import {
  formatOvr,
  levelFaceFor,
  ovrFromMu,
  type LevelFace,
} from "@repo/domain/football-ovr";
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

/** The Ratings screen's "+2 last 8": the counting Matches the change spans. */
const CHANGE_OVER_LAST_MATCHES = 8;

function ratingSport(sport: Sport): GroupSportEnum {
  return sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;
}

function shownOnFace(face: LevelFace, mu: number) {
  return face === "ovr" ? formatOvr(ovrFromMu(mu)) : displayedLevelFromMu(mu);
}

/**
 * Level points oldest first, on the sport's face (OVR on football), and how
 * many of the changes between them came from Rated Matches. Level overrides
 * move the line too but are not Matches.
 */
async function levelHistory(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
  face: LevelFace,
): Promise<{ points: string[]; matchCount: number }> {
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

  const eventIds = new Set(events.map((event) => event.id));
  const changes = [...events, ...overrides]
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(-HISTORY_CHANGE_LIMIT);

  const first = changes[0];
  if (!first) {
    return { points: [], matchCount: 0 };
  }

  return {
    points: [
      shownOnFace(face, first.muBefore),
      ...changes.map((change) => shownOnFace(face, change.muAfter)),
    ],
    matchCount: changes.filter((change) => eventIds.has(change.id)).length,
  };
}

function faceValue(face: LevelFace, mu: number) {
  return face === "ovr" ? ovrFromMu(mu) : levelFromMu(mu);
}

/**
 * What the last eight counting Matches did to the Level, on the sport's face
 * (OVR points on football, Level on padel), and the face after each, oldest
 * first, for the sparkline beside it. A Level override between them is not a
 * Match, so it moves neither.
 */
async function changeOverLast(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
  face: LevelFace,
): Promise<{ matches: number; delta: number; points: number[] } | null> {
  const newestFirst = await database.query.ratingEvents.findMany({
    where: and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)),
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    limit: CHANGE_OVER_LAST_MATCHES,
    columns: { muBefore: true, muAfter: true },
  });
  const events = [...newestFirst].reverse();
  const first = events[0];
  if (!first) {
    return null;
  }
  const steps = events.map(
    (event) => faceValue(face, event.muAfter) - faceValue(face, event.muBefore),
  );
  let running = faceValue(face, first.muBefore);
  return {
    matches: events.length,
    delta: steps.reduce((total, step) => total + step, 0),
    points: [
      running,
      ...steps.map((step) => {
        running += step;
        return running;
      }),
    ],
  };
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
 * and recent Level history for the home sparkline with the number of Rated
 * Matches inside it. `face` says how the sport shows its Level; on football
 * `ovr` is the whole-number OVR and the history is in OVR (ADR-0069).
 * `levelValue` is the continuous Level padel shows from 1.00 (ADR-0070).
 * `changeOverLast` is what the last eight counting Matches moved it, on the
 * face, for the Ratings screen.
 */
export async function loadRatingsMe(
  database: DbClient,
  args: { userId: string; sport?: Sport },
) {
  const face = levelFaceFor(args.sport ?? "padel");
  const sport = ratingSport(args.sport ?? "padel");
  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, args.userId), eq(ratings.sport, sport)),
  });

  if (!row) {
    return {
      face,
      ovr: null as number | null,
      levelValue: null as number | null,
      rating: null,
      canSelfDeclare: !(await userHasRatedMatch(database, args.userId, sport)),
      progressPercent: null as number | null,
      nextBand: null as LevelBand | null,
      history: [] as string[],
      historyMatchCount: 0,
      ratedMatchCount: 0,
      changeOverLast: null as Awaited<ReturnType<typeof changeOverLast>>,
    };
  }

  const rating = youRatingViewAfterIdle(row, new Date());
  // Idle inflation does not change μ; progress uses the same continuous Level
  // as the displayed product number.
  const levelValue = levelFromMu(row.mu);
  const progress = progressToNextBand(levelValue, rating.levelBand);
  const [history, matchCount, change] = await Promise.all([
    levelHistory(database, args.userId, sport, face),
    ratedMatchCount(database, args.userId, sport),
    changeOverLast(database, args.userId, sport, face),
  ]);

  return {
    face,
    ovr: face === "ovr" ? Math.round(ovrFromMu(row.mu)) : null,
    levelValue,
    rating,
    canSelfDeclare: false,
    progressPercent: progress.progressPercent,
    nextBand: progress.nextBand,
    history: history.points,
    historyMatchCount: history.matchCount,
    ratedMatchCount: matchCount,
    changeOverLast: change,
  };
}

export const me = protectedProcedure
  .input(z.object({ sport: sportSchema }).optional())
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadRatingsMe(ctx.db, { userId: appUser.id, sport: input?.sport });
  });
