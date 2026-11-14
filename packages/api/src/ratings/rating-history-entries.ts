import { inArray } from "drizzle-orm";

import { matches, user, type groupTierEvents } from "@repo/db";
import type { RatingHistoryEntryData } from "@repo/domain/rating-history";
import {
  scoredSetsFromMatch,
  seatedUserSlotOnMatch,
} from "@repo/domain/match-slots";

import { type db } from "#src/db";

type DbClient = typeof db;

type TierEventRow = typeof groupTierEvents.$inferSelect;

type SideRoster = {
  players: { gamePlayer: { userId: string | null } | null }[];
} | null;

const sideRoster = {
  columns: {},
  with: {
    players: {
      columns: {},
      with: { gamePlayer: { columns: { userId: true } } },
    },
  },
} as const;

/**
 * The Matches a Rating history names, with what its lines read: when the
 * Game was played, where, its scored Sets, its two sides and its MVP.
 */
export async function ratingHistoryMatches(
  database: DbClient,
  matchIds: readonly string[],
) {
  const unique = [...new Set(matchIds)];
  const rows =
    unique.length === 0
      ? []
      : await database.query.matches.findMany({
          where: inArray(matches.id, unique),
          columns: { id: true, startTime: true },
          with: {
            game: {
              columns: {
                windowStart: true,
                mvpUserId: true,
                mvpDecidedBy: true,
                mvpSettledAt: true,
              },
              with: { venue: { columns: { name: true } } },
            },
            sets: {
              columns: { slot1GamesWon: true, slot2GamesWon: true },
              orderBy: (table, { asc }) => [asc(table.setNumber)],
            },
            slot1GameTeam: sideRoster,
            slot2GameTeam: sideRoster,
          },
        });
  return new Map(rows.map((row) => [row.id, row]));
}

export type RatingHistoryMatch = NonNullable<
  ReturnType<Awaited<ReturnType<typeof ratingHistoryMatches>>["get"]>
>;

/** The Match's scored Sets read from the member's side; null when not on one. */
export function setsFromSideOf(
  match: {
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
    slot1GameTeam: SideRoster;
    slot2GameTeam: SideRoster;
  },
  userId: string,
): { own: number; opponent: number }[] | null {
  const userIdsOf = (team: SideRoster) =>
    (team?.players ?? []).flatMap((link) => link.gamePlayer?.userId ?? []);
  const slot = seatedUserSlotOnMatch(
    {
      slot1UserIds: userIdsOf(match.slot1GameTeam),
      slot2UserIds: userIdsOf(match.slot2GameTeam),
    },
    userId,
  );
  if (slot == null) {
    return null;
  }
  return scoredSetsFromMatch(match.sets).map((set) =>
    slot === 1
      ? { own: set.slot1GamesWon, opponent: set.slot2GamesWon }
      : { own: set.slot2GamesWon, opponent: set.slot1GamesWon },
  );
}

/** Names of the Users who made manual changes, by id. */
export async function setterNames(
  database: DbClient,
  userIds: readonly (string | null)[],
) {
  const ids = [...new Set(userIds.filter((id): id is string => id != null))];
  const rows =
    ids.length === 0
      ? []
      : await database.query.user.findMany({
          where: inArray(user.id, ids),
          columns: { id: true, name: true },
        });
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * A member's `game` and `adjustment` Tier events as Rating history lines
 * (ADR-0073): each Game with its score from their side, each Tier adjustment
 * with who set it, the reason and the note.
 */
export async function tierHistoryEntries(
  database: DbClient,
  userId: string,
  events: readonly TierEventRow[],
): Promise<RatingHistoryEntryData[]> {
  const [matchById, setterById] = await Promise.all([
    ratingHistoryMatches(
      database,
      events.flatMap((event) =>
        event.kind === "game" && event.matchId ? [event.matchId] : [],
      ),
    ),
    setterNames(
      database,
      events.map((event) => event.setByUserId),
    ),
  ]);

  return events.map((event): RatingHistoryEntryData => {
    if (event.kind === "adjustment") {
      const setter = event.setByUserId
        ? setterById.get(event.setByUserId)
        : undefined;
      return {
        kind: "tier_adjustment",
        id: event.id,
        at: event.createdAt,
        delta: event.delta,
        pointsBefore: event.pointsBefore,
        pointsAfter: event.pointsAfter,
        setBy: setter ? { userId: setter.id, name: setter.name } : null,
        reason: event.reason,
        note: event.note,
      };
    }
    const match = event.matchId ? matchById.get(event.matchId) : undefined;
    const [set] = match ? (setsFromSideOf(match, userId) ?? []) : [];
    return {
      kind: "tier_game",
      id: event.id,
      at: event.createdAt,
      playedAt: match?.game?.windowStart ?? match?.startTime ?? null,
      delta: event.delta,
      resultDelta: event.resultDelta,
      performanceDelta: event.performanceDelta,
      ratingHundredths: event.ratingHundredths,
      pointsBefore: event.pointsBefore,
      pointsAfter: event.pointsAfter,
      score: set ?? null,
    };
  });
}
