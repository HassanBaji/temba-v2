import { and, asc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  MatchStatusEnum,
  games,
  groups,
  marks,
  matches,
  user,
  venues,
} from "@repo/db";

import type { CabinetEntry, CoinKind } from "@repo/domain/marks";
import { sportOrDefault } from "@repo/domain/sport";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What a client needs to name the Game a coin came from, in its own locale. */
export type CabinetGame = {
  name: string | null;
  hasCustomName: boolean;
  format: (typeof games.$inferSelect)["format"];
  windowStart: Date | null;
  windowEnd: Date | null;
  groupName: string | null;
  venueName: string;
};

export type ReceivedCoin = CabinetEntry & {
  gameId: string;
  matchId: string | null;
  game: CabinetGame;
  /** Who gave the Mark; null for an MVP. */
  giver: { userId: string; name: string; image: string | null } | null;
};

const gameColumns = {
  gameId: games.id,
  gameName: games.name,
  hasCustomName: games.hasCustomName,
  format: games.format,
  windowStart: games.windowStart,
  windowEnd: games.windowEnd,
  gameCreatedAt: games.createdAt,
  sport: games.sport,
  groupName: groups.name,
  venueName: venues.name,
};

type GameColumns = {
  gameName: string | null;
  hasCustomName: boolean;
  format: CabinetGame["format"];
  windowStart: Date | null;
  windowEnd: Date | null;
  gameCreatedAt: Date;
  sport: string | null;
  groupName: string | null;
  venueName: string;
};

function cabinetGame(row: GameColumns): CabinetGame {
  return {
    name: row.gameName,
    hasCustomName: row.hasCustomName,
    format: row.format,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    groupName: row.groupName,
    venueName: row.venueName,
  };
}

function playedAt(row: GameColumns, matchStart: Date | null) {
  return matchStart ?? row.windowStart ?? row.gameCreatedAt;
}

async function receivedMarks(
  database: DbClient,
  userId: string,
  kind: CoinKind | undefined,
): Promise<ReceivedCoin[]> {
  const giver = alias(user, "giver");
  const rows = await database
    .select({
      ...gameColumns,
      kind: marks.kind,
      receivedAt: marks.createdAt,
      matchId: matches.id,
      matchStart: matches.startTime,
      giverUserId: giver.id,
      giverName: giver.name,
      giverImage: giver.image,
    })
    .from(marks)
    .innerJoin(matches, eq(marks.matchId, matches.id))
    .innerJoin(games, eq(matches.gameId, games.id))
    .innerJoin(venues, eq(games.venueId, venues.id))
    .leftJoin(groups, eq(games.groupId, groups.id))
    .innerJoin(giver, eq(marks.giverUserId, giver.id))
    .where(
      and(
        eq(marks.receiverUserId, userId),
        isNull(games.cancelledAt),
        kind && kind !== "mvp" ? eq(marks.kind, kind) : undefined,
      ),
    );
  return rows.map((row) => ({
    kind: row.kind,
    sport: sportOrDefault(row.sport),
    playedAt: playedAt(row, row.matchStart),
    receivedAt: row.receivedAt,
    decidedBy: null,
    gameId: row.gameId,
    matchId: row.matchId,
    game: cabinetGame(row),
    giver: {
      userId: row.giverUserId,
      name: row.giverName,
      image: row.giverImage,
    },
  }));
}

/** Only a settled MVP counts: before that an Organizer's pick may still change. */
async function receivedMvps(
  database: DbClient,
  userId: string,
): Promise<ReceivedCoin[]> {
  const rows = await database
    .select({
      ...gameColumns,
      decidedBy: games.mvpDecidedBy,
      settledAt: games.mvpSettledAt,
    })
    .from(games)
    .innerJoin(venues, eq(games.venueId, venues.id))
    .leftJoin(groups, eq(games.groupId, groups.id))
    .where(
      and(
        eq(games.mvpUserId, userId),
        isNotNull(games.mvpSettledAt),
        isNull(games.cancelledAt),
      ),
    );
  const gameIds = rows.map((row) => row.gameId);
  const gameMatches =
    gameIds.length === 0
      ? []
      : await database.query.matches.findMany({
          where: and(
            inArray(matches.gameId, gameIds),
            ne(matches.status, MatchStatusEnum.CANCELLED),
          ),
          columns: { id: true, gameId: true, startTime: true },
          orderBy: [asc(matches.createdAt)],
        });
  const matchOf = (gameId: string) =>
    gameMatches.find((match) => match.gameId === gameId) ?? null;

  return rows.map((row) => {
    const match = matchOf(row.gameId);
    return {
      kind: "mvp" as const,
      sport: sportOrDefault(row.sport),
      playedAt: playedAt(row, match?.startTime ?? null),
      receivedAt: row.settledAt ?? row.gameCreatedAt,
      decidedBy: row.decidedBy,
      gameId: row.gameId,
      matchId: match?.id ?? null,
      game: cabinetGame(row),
      giver: null,
    };
  });
}

/**
 * Every coin a User received, in every sport, or only those of one kind:
 * the Marks given to them and the settled MVPs they were named. A Mark
 * counts even after its giver or receiver left the roster (the Mark is the
 * record); a cancelled Game counts for nothing. Roast hiding is the caller's.
 */
export async function loadReceivedCoins(
  database: DbClient,
  args: { userId: string; kind?: CoinKind },
): Promise<ReceivedCoin[]> {
  const [given, mvps] = await Promise.all([
    args.kind === "mvp"
      ? Promise.resolve([])
      : receivedMarks(database, args.userId, args.kind),
    args.kind === undefined || args.kind === "mvp"
      ? receivedMvps(database, args.userId)
      : Promise.resolve([]),
  ]);
  return [...given, ...mvps];
}
