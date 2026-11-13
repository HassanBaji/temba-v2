import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  lt,
  lte,
  notExists,
  sql,
} from "drizzle-orm";

import {
  games,
  GroupSportEnum,
  levelOverrides,
  matches,
  ratingEvents,
  type DbClient as AnyDbClient,
  type DbTx,
} from "@repo/db";
import { FOOTBALL_MATCHES_TO_CONFIRM } from "@repo/domain/football-ovr";
import {
  RATED_MATCHES_TO_CONFIRM,
  tembaLevelView,
  UNCONFIRMED_PADEL,
  type LevelBand,
  type PadelConfirmation,
  type YouRatingView,
} from "@repo/domain/level";
import type { Sport } from "@repo/domain/sport";

import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | DbTx | AnyDbClient;

export type LevelConfirmation = {
  /** The `rating_events` row of the Match that confirmed the Level. */
  eventId: string;
  userId: string;
  sport: Sport;
  matchId: string;
  muAfter: number;
  /** Counting Matches in the sport up to and including this one. */
  matchesCounted: number;
};

function shownAt(column: typeof ratingEvents.createdAt) {
  return sql`date_trunc('milliseconds', ${column})`;
}

/**
 * A padel `rating_events` row counts towards confirming the Level when its
 * Game is on a Group: a Game is stored rated only on a Verified Group, as the
 * Group was when the Game was created (ADR-0035). Public Games and Challenge
 * Games have no Group. Read with `matches` and `games` joined.
 */
const padelVerifiedEvent = and(
  eq(ratingEvents.sport, GroupSportEnum.PADEL),
  isNotNull(games.groupId),
);

/**
 * What confirms each User's padel Level (ADR-0074): their Rated Matches in a
 * Verified Group and whether a Level override was ever set, as of `asOf` when
 * given. A reversed Match's events are gone, so it no longer counts. The one
 * read every padel Provisional goes through.
 */
export async function padelConfirmations(
  database: DbClient,
  args: { userIds: readonly string[]; asOf?: Date },
): Promise<(userId: string) => PadelConfirmation> {
  const userIds = [...new Set(args.userIds)];
  if (userIds.length === 0) {
    return () => UNCONFIRMED_PADEL;
  }
  const [counted, overridden] = await Promise.all([
    database
      .select({ userId: ratingEvents.userId, matches: count() })
      .from(ratingEvents)
      .innerJoin(matches, eq(matches.id, ratingEvents.matchId))
      .innerJoin(games, eq(games.id, matches.gameId))
      .where(
        and(
          padelVerifiedEvent,
          inArray(ratingEvents.userId, userIds),
          args.asOf ? lte(ratingEvents.createdAt, args.asOf) : undefined,
        ),
      )
      .groupBy(ratingEvents.userId),
    database
      .selectDistinct({ userId: levelOverrides.userId })
      .from(levelOverrides)
      .where(
        and(
          eq(levelOverrides.sport, GroupSportEnum.PADEL),
          inArray(levelOverrides.userId, userIds),
          args.asOf ? lte(levelOverrides.createdAt, args.asOf) : undefined,
        ),
      ),
  ]);
  const countByUser = new Map(
    counted.map((row) => [row.userId, Number(row.matches)]),
  );
  const overriddenUsers = new Set(overridden.map((row) => row.userId));
  return (userId) => ({
    verifiedMatches: countByUser.get(userId) ?? 0,
    overridden: overriddenUsers.has(userId),
  });
}

type TembaRatingRow = {
  userId: string;
  sport: string;
  mu: number;
  phi: number;
  levelBand: LevelBand;
};

/**
 * The Temba Level views of `ratings` rows as every App surface reads them,
 * padel ones with their confirmation read once for all.
 */
export async function tembaLevelViews(
  database: DbClient,
  rows: readonly TembaRatingRow[],
): Promise<(row: TembaRatingRow) => YouRatingView> {
  const confirmation = await padelConfirmations(database, {
    userIds: rows
      .filter((row) => row.sport !== "football")
      .map((row) => row.userId),
  });
  return (row) => tembaLevelView(row, confirmation(row.userId));
}

export async function readTembaLevelView(
  database: DbClient,
  row: TembaRatingRow,
): Promise<YouRatingView> {
  return (await tembaLevelViews(database, [row]))(row);
}

/**
 * The `rating_events` row that is each User's fifth of those that still count
 * in the sport, unless a Level override had already confirmed the Level
 * before it. A reversed Match's events are gone, so the fifth is read again
 * from what is left: on football every counting Match, on padel the Rated
 * Matches in a Verified Group.
 */
async function fifthCountingEvents(
  database: DbClient,
  userIds: string[],
  sport: Sport,
): Promise<LevelConfirmation[]> {
  const matchesToConfirm =
    sport === "football"
      ? FOOTBALL_MATCHES_TO_CONFIRM
      : RATED_MATCHES_TO_CONFIRM;
  const ranked = database
    .select({
      eventId: ratingEvents.id,
      userId: ratingEvents.userId,
      matchId: ratingEvents.matchId,
      muAfter: ratingEvents.muAfter,
      createdAt: ratingEvents.createdAt,
      place:
        sql<number>`row_number() over (partition by ${ratingEvents.userId} order by ${shownAt(ratingEvents.createdAt)}, ${ratingEvents.id})`.as(
          "place",
        ),
    })
    .from(ratingEvents)
    .innerJoin(matches, eq(matches.id, ratingEvents.matchId))
    .innerJoin(games, eq(games.id, matches.gameId))
    .where(
      and(
        sport === "football"
          ? eq(ratingEvents.sport, GroupSportEnum.FOOTBALL)
          : padelVerifiedEvent,
        inArray(ratingEvents.userId, userIds),
      ),
    )
    .as("ranked");
  const fifths = await database
    .select({
      eventId: ranked.eventId,
      userId: ranked.userId,
      matchId: ranked.matchId,
      muAfter: ranked.muAfter,
    })
    .from(ranked)
    .where(
      and(
        eq(ranked.place, matchesToConfirm),
        notExists(
          database
            .select({ id: levelOverrides.id })
            .from(levelOverrides)
            .where(
              and(
                eq(levelOverrides.userId, ranked.userId),
                eq(levelOverrides.sport, sport),
                lt(levelOverrides.createdAt, ranked.createdAt),
              ),
            ),
        ),
      ),
    );
  return fifths.map((fifth) => ({
    ...fifth,
    sport,
    matchesCounted: matchesToConfirm,
  }));
}

/**
 * Where each User's Level was confirmed in a sport, derived from the ledger
 * (ADR-0073), which is when the hatched track clears: on football the fifth
 * counting Match, on padel the fifth Rated Match in a Verified Group. At most
 * one per User and sport, and none while a Level override keeps the Level
 * confirmed.
 */
export async function levelConfirmations(
  database: DbClient,
  args: { userIds: readonly string[]; sport?: Sport },
): Promise<LevelConfirmation[]> {
  const userIds = [...new Set(args.userIds)];
  if (userIds.length === 0) {
    return [];
  }
  const [football, padel] = await Promise.all([
    args.sport === "padel"
      ? []
      : fifthCountingEvents(database, userIds, "football"),
    args.sport === "football"
      ? []
      : fifthCountingEvents(database, userIds, "padel"),
  ]);
  return [...football, ...padel];
}

/**
 * Tells each of `userIds` whose Level this Match confirmed, once per sport:
 * the dedupe key holds if a reversal and a later Match confirm it again.
 * Call it in the Match's rating transaction, after its `rating_events` rows.
 */
export async function notifyLevelConfirmed(
  database: DbClient,
  args: { matchId: string; sport: Sport; userIds: readonly string[] },
): Promise<void> {
  const confirmed = (
    await levelConfirmations(database, {
      userIds: args.userIds,
      sport: args.sport,
    })
  ).filter((row) => row.matchId === args.matchId);
  if (confirmed.length === 0) {
    return;
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, args.matchId),
    columns: { gameId: true },
  });
  await notify(database, {
    type: "level_confirmed",
    recipients: confirmed.map((row) => ({
      userId: row.userId,
      audience: "player" as const,
    })),
    excludeUserIds: [],
    gameId: match?.gameId ?? null,
    dedupeKey: `level_confirmed:${args.sport}`,
  });
}
