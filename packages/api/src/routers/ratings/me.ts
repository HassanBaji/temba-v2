import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import {
  GroupSportEnum,
  kingPlaceAwards,
  levelOverrides,
  ratingEvents,
  ratings,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { userHasRatedMatch } from "#src/ratings/has-rated-match";
import { readTembaLevelView } from "#src/ratings/level-confirmed";
import {
  ratingHistoryMatches,
  setsFromSideOf,
} from "#src/ratings/rating-history-entries";
import {
  formatOvr,
  levelFaceFor,
  ovrFromMu,
  wholeOvrFromMu,
  type LevelFace,
} from "@repo/domain/football-ovr";
import {
  displayedLevelFromMu,
  levelFromMu,
  progressToNextBand,
  type LevelBand,
} from "@repo/domain/level";
import type { LevelHistoryStep } from "@repo/domain/home-level-chart";
import type { RatingsLastMatch } from "@repo/domain/ratings-screen";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Recent Level changes (Rated Matches and sets) for the home Trend. */
const HISTORY_CHANGE_LIMIT = 15;

/** The Ratings screen's "+2 last 8": the counting Matches the change spans. */
const CHANGE_OVER_LAST_MATCHES = 8;

function ratingSport(sport: Sport): GroupSportEnum {
  return sport === "football" ? GroupSportEnum.FOOTBALL : GroupSportEnum.PADEL;
}

function shownOnFace(face: LevelFace, mu: number) {
  return face === "ovr" ? formatOvr(ovrFromMu(mu)) : displayedLevelFromMu(mu);
}

function stepFromOutcomeScore(
  outcomeScore: number,
): RatingsLastMatch["outcome"] {
  if (outcomeScore > 0.5) {
    return "won";
  }
  return outcomeScore < 0.5 ? "lost" : "drawn";
}

/**
 * Level points oldest first, on the sport's face (OVR on football), what
 * moved the Level into each point after the first, and how many of those
 * changes came from Rated Matches. Level overrides and King of the court
 * Place awards move the line too but are not Matches.
 */
async function levelHistory(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
  face: LevelFace,
): Promise<{
  points: string[];
  steps: LevelHistoryStep[];
  matchCount: number;
}> {
  const [events, overrides, awards] = await Promise.all([
    database.query.ratingEvents.findMany({
      where: and(
        eq(ratingEvents.userId, userId),
        eq(ratingEvents.sport, sport),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
      limit: HISTORY_CHANGE_LIMIT,
      columns: {
        id: true,
        createdAt: true,
        muBefore: true,
        muAfter: true,
        outcomeScore: true,
      },
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
    database.query.kingPlaceAwards.findMany({
      where: and(
        eq(kingPlaceAwards.userId, userId),
        eq(kingPlaceAwards.sport, sport),
      ),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
      limit: HISTORY_CHANGE_LIMIT,
      columns: { id: true, createdAt: true, muBefore: true, muAfter: true },
    }),
  ]);

  const outcomeById = new Map(
    events.map((event) => [event.id, event.outcomeScore]),
  );
  const awardIds = new Set(awards.map((award) => award.id));
  const changes = [...events, ...overrides, ...awards]
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(-HISTORY_CHANGE_LIMIT);

  const first = changes[0];
  if (!first) {
    return { points: [], steps: [], matchCount: 0 };
  }

  return {
    points: [
      shownOnFace(face, first.muBefore),
      ...changes.map((change) => shownOnFace(face, change.muAfter)),
    ],
    steps: changes.map((change) => {
      const outcomeScore = outcomeById.get(change.id);
      if (outcomeScore !== undefined) {
        return stepFromOutcomeScore(outcomeScore);
      }
      return awardIds.has(change.id) ? "placed" : "set";
    }),
    matchCount: changes.filter((change) => outcomeById.has(change.id)).length,
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

/**
 * The newest Rated Match for football's "Last match" line: how it ended, its
 * Score from the player's side, and the Level either side of it.
 */
async function lastRatedMatch(
  database: DbClient,
  userId: string,
  sport: GroupSportEnum,
): Promise<RatingsLastMatch | null> {
  const event = await database.query.ratingEvents.findFirst({
    where: and(eq(ratingEvents.userId, userId), eq(ratingEvents.sport, sport)),
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    columns: {
      matchId: true,
      outcomeScore: true,
      muBefore: true,
      muAfter: true,
    },
  });
  if (!event) {
    return null;
  }
  const match = (await ratingHistoryMatches(database, [event.matchId])).get(
    event.matchId,
  );
  return {
    outcome: stepFromOutcomeScore(event.outcomeScore),
    sets: match ? setsFromSideOf(match, userId) : null,
    muBefore: event.muBefore,
    muAfter: event.muAfter,
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
 * Current Rating in one sport (padel unless asked) for the signed-in User.
 * Returns product Level / Level band / Provisional only — never raw Glicko
 * μ/φ/σ. Also includes progress within the current Level band, the Rated
 * Matches that still confirm it while Provisional,
 * and recent Level history for the home Trend, with what moved each point
 * and the number of Rated Matches inside it. `face` says how the sport shows its Level; on football
 * `ovr` is the whole-number OVR and the history is in OVR (ADR-0069).
 * `levelValue` is the continuous Level padel shows from 1.00 (ADR-0070).
 * `changeOverLast` is what the last eight counting Matches moved it, on the
 * face, for the Ratings screen. `lastMatch` is the newest Rated Match, for
 * football's "Last match" line.
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
      historySteps: [] as LevelHistoryStep[],
      historyMatchCount: 0,
      ratedMatchCount: 0,
      changeOverLast: null as Awaited<ReturnType<typeof changeOverLast>>,
      lastMatch: null as RatingsLastMatch | null,
    };
  }

  const rating = await readTembaLevelView(database, row);
  const levelValue = levelFromMu(row.mu);
  const progress = progressToNextBand(levelValue, rating.levelBand);
  const [history, matchCount, change, lastMatch] = await Promise.all([
    levelHistory(database, args.userId, sport, face),
    ratedMatchCount(database, args.userId, sport),
    changeOverLast(database, args.userId, sport, face),
    lastRatedMatch(database, args.userId, sport),
  ]);

  return {
    face,
    ovr: face === "ovr" ? wholeOvrFromMu(row.mu) : null,
    levelValue,
    rating,
    canSelfDeclare: false,
    progressPercent: progress.progressPercent,
    nextBand: progress.nextBand,
    history: history.points,
    historySteps: history.steps,
    historyMatchCount: history.matchCount,
    ratedMatchCount: matchCount,
    changeOverLast: change,
    lastMatch,
  };
}

export const me = protectedProcedure
  .input(z.object({ sport: sportSchema }).optional())
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadRatingsMe(ctx.db, { userId: appUser.id, sport: input?.sport });
  });
