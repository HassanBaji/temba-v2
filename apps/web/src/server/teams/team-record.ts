import { and, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gameTeams, matches } from "@repo/db";

import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export type TeamRecord = {
  gamesPlayed: number;
  wins: number;
  losses: number;
};

type TeamRecordMatch = {
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

/**
 * Record of one Team across its completed Matches, given the ids of the Game
 * teams the Team sat as. A draw is played, neither won nor lost.
 */
export function teamRecordFromMatches(
  matchesOfTeam: readonly TeamRecordMatch[],
  teamGameTeamIds: ReadonlySet<string>,
): TeamRecord {
  const record: TeamRecord = { gamesPlayed: 0, wins: 0, losses: 0 };
  for (const match of matchesOfTeam) {
    const slot = teamGameTeamIds.has(match.slot1GameTeamId ?? "")
      ? 1
      : teamGameTeamIds.has(match.slot2GameTeamId ?? "")
        ? 2
        : null;
    if (slot === null) {
      continue;
    }
    record.gamesPlayed += 1;
    const { result } = matchOutcome(match.sets);
    if (result === "slot1" || result === "slot2") {
      if (result === `slot${slot}`) {
        record.wins += 1;
      } else {
        record.losses += 1;
      }
    }
  }
  return record;
}

/**
 * Derived on every read from the completed Matches of the Team's non-cancelled
 * Games. A Match awaiting confirmation and a Walkover (a cancelled Match) do
 * not count. There are no stored counters.
 */
export async function loadTeamRecord(
  database: DbClient,
  teamId: string,
): Promise<TeamRecord> {
  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.teamId, teamId),
    columns: { id: true },
  });
  const gameTeamIds = teamRows.map((row) => row.id);
  if (gameTeamIds.length === 0) {
    return { gamesPlayed: 0, wins: 0, losses: 0 };
  }

  const completed = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, gameTeamIds),
        inArray(matches.slot2GameTeamId, gameTeamIds),
      ),
    ),
    columns: { slot1GameTeamId: true, slot2GameTeamId: true },
    with: {
      game: { columns: { cancelledAt: true } },
      sets: { columns: { slot1GamesWon: true, slot2GamesWon: true } },
    },
  });

  return teamRecordFromMatches(
    completed.filter((match) => match.game?.cancelledAt == null),
    new Set(gameTeamIds),
  );
}
