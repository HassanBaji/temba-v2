import { asc, eq } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  matchSets,
  matches,
  type DbClient as RepoDbClient,
} from "@repo/db";

import { type AmericanoResult } from "@repo/domain/tournament-americano";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  tournamentMatchState,
  type TournamentMatchState,
} from "@repo/domain/tournament-round-state";

import { type db } from "#src/db";

type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | RepoDbClient;

/**
 * An Americano Match seats its players directly, so its slots hold no Game
 * team (ADR-0094). A Knockout Match waiting for its qualifiers has empty
 * slots too, so callers read the seats and fall back when there are none.
 */
export function mayHaveAmericanoSeats(match: {
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
}) {
  return !match.slot1GameTeamId && !match.slot2GameTeamId;
}

export type AmericanoSeatPlayer = {
  gamePlayerId: string;
  userId: string | null;
  name: string;
  image: string | null;
};

/** Every player on an Americano, in the order they took a seat. */
export async function loadAmericanoPlayers(
  database: DbClient,
  gameId: string,
): Promise<AmericanoSeatPlayer[]> {
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    orderBy: [asc(gamePlayers.createdAt), asc(gamePlayers.id)],
    columns: { id: true, userId: true },
    with: { user: { columns: { id: true, name: true, image: true } } },
  });
  return rows.flatMap((row) =>
    row.user
      ? [
          {
            gamePlayerId: row.id,
            userId: row.userId,
            name: row.user.name,
            image: row.user.image,
          },
        ]
      : [],
  );
}

/**
 * An Americano's posted Matches, Round by Round and Court by Court, with each
 * Match's single Set and its seats (ADR-0094).
 */
export async function loadAmericanoMatches(database: DbClient, gameId: string) {
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
    orderBy: [asc(matches.roundNumber), asc(matches.startTime)],
    with: {
      sets: {
        columns: { slot1GamesWon: true, slot2GamesWon: true },
        orderBy: asc(matchSets.setNumber),
      },
      americanoSeats: {
        columns: { id: true, gamePlayerId: true, slot: true },
      },
      court: { columns: { id: true, name: true } },
    },
  });
  return rows
    .filter((row) => row.roundNumber != null && row.americanoSeats.length > 0)
    .map((row) => ({
      ...row,
      roundNumber: row.roundNumber ?? 0,
      slot1: row.americanoSeats
        .filter((seat) => seat.slot === 1)
        .map((seat) => seat.gamePlayerId)
        .sort(),
      slot2: row.americanoSeats
        .filter((seat) => seat.slot === 2)
        .map((seat) => seat.gamePlayerId)
        .sort(),
    }))
    .sort(
      (left, right) =>
        left.roundNumber - right.roundNumber ||
        (left.startTime?.getTime() ?? 0) - (right.startTime?.getTime() ?? 0) ||
        (left.court?.name ?? "").localeCompare(right.court?.name ?? "") ||
        left.id.localeCompare(right.id),
    );
}

export type AmericanoMatch = Awaited<
  ReturnType<typeof loadAmericanoMatches>
>[number];

export function americanoMatchState(
  row: Pick<AmericanoMatch, "status" | "notFinishedAt" | "sets" | "startTime">,
  now: Date,
): TournamentMatchState {
  return tournamentMatchState({
    status: row.status,
    notFinishedAt: row.notFinishedAt,
    hasResult: matchOutcome(row.sets).result !== "none",
    startTime: row.startTime,
    now,
  });
}

/** A Round with a score or a completed Match has started: its players stay put. */
export function americanoRoundHasScore(
  rows: readonly { sets: readonly unknown[]; status: string | null }[],
) {
  return rows.some(
    (row) => row.sets.length > 0 || row.status === MatchStatusEnum.COMPLETED,
  );
}

/**
 * The day is over once every Match is settled (completed, cancelled or did
 * not finish) and at least one completed. It then leaves My Games for Played.
 */
export function americanoDayFinished(
  rows: readonly { status: string | null; notFinishedAt?: Date | null }[],
) {
  return (
    rows.some((row) => row.status === MatchStatusEnum.COMPLETED) &&
    rows.every(
      (row) =>
        row.status === MatchStatusEnum.COMPLETED ||
        row.status === MatchStatusEnum.CANCELLED ||
        row.notFinishedAt != null,
    )
  );
}

/** The confirmed results the Americano table counts: completed Matches with a score. */
export function americanoResults(
  rows: readonly AmericanoMatch[],
): AmericanoResult[] {
  return rows.flatMap((row) => {
    const slot1GamesWon = row.sets[0]?.slot1GamesWon;
    const slot2GamesWon = row.sets[0]?.slot2GamesWon;
    if (
      row.status !== MatchStatusEnum.COMPLETED ||
      slot1GamesWon == null ||
      slot2GamesWon == null ||
      matchOutcome(row.sets).result === "none"
    ) {
      return [];
    }
    return [
      { slot1: row.slot1, slot2: row.slot2, slot1GamesWon, slot2GamesWon },
    ];
  });
}
