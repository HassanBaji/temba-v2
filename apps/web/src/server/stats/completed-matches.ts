import { and, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gamePlayers, matches } from "@repo/db";

import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  slotMembers,
  userSlotOnMatch,
  type MatchSlotTeam,
} from "~/server/games/match-slots";
import { gameListTime } from "~/server/home/upcoming-games";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export type MatchSetScore = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type CompletedMatchSlotPlayer = {
  userId: string;
  name: string;
};

/**
 * Completed Matches the User sat on via a Game team slot. Cancelled Games are
 * omitted. Drawn Matches stay in the list: they are played, not won or lost.
 */
export type CompletedMatchForStats = {
  matchId: string;
  createdAt: Date;
  displayTime: Date;
  userSlot: 1 | 2;
  sets: readonly MatchSetScore[];
  slot1Players: readonly CompletedMatchSlotPlayer[];
  slot2Players: readonly CompletedMatchSlotPlayer[];
};

export type CompletedMatchStats = {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
};

function playersOnSlot(team: MatchSlotTeam): CompletedMatchSlotPlayer[] {
  return slotMembers(team, null).map((member) => ({
    userId: member.id,
    name: member.name,
  }));
}

export function summarizeCompletedMatchStats(
  played: readonly Pick<CompletedMatchForStats, "userSlot" | "sets">[],
): CompletedMatchStats {
  let gamesWon = 0;
  let gamesLost = 0;
  let setsWon = 0;
  let setsLost = 0;
  for (const match of played) {
    const outcome = matchOutcome(match.sets);
    const won =
      match.userSlot === 1
        ? outcome.result === "slot1"
        : outcome.result === "slot2";
    const lost =
      match.userSlot === 1
        ? outcome.result === "slot2"
        : outcome.result === "slot1";
    if (match.userSlot === 1) {
      setsWon += outcome.slot1SetWins;
      setsLost += outcome.slot2SetWins;
    } else {
      setsWon += outcome.slot2SetWins;
      setsLost += outcome.slot1SetWins;
    }
    if (won) {
      gamesWon += 1;
    }
    if (lost) {
      gamesLost += 1;
    }
  }
  return {
    gamesPlayed: played.length,
    gamesWon,
    gamesLost,
    setsWon,
    setsLost,
  };
}

export async function loadCompletedMatchesForUser(
  database: DbClient,
  userId: string,
): Promise<CompletedMatchForStats[]> {
  const myPlayerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { id: true },
    with: {
      gameTeamPlayers: {
        columns: { gameTeamId: true },
      },
    },
  });
  const myGameTeamIds = [
    ...new Set(
      myPlayerRows.flatMap((row) =>
        row.gameTeamPlayers.map((link) => link.gameTeamId),
      ),
    ),
  ];
  if (myGameTeamIds.length === 0) {
    return [];
  }

  const completedMatches = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, myGameTeamIds),
        inArray(matches.slot2GameTeamId, myGameTeamIds),
      ),
    ),
    columns: {
      id: true,
      startTime: true,
      createdAt: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
    },
    with: {
      game: {
        columns: {
          id: true,
          groupId: true,
          cancelledAt: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
          format: true,
        },
        with: {
          matches: {
            columns: {
              startTime: true,
              status: true,
            },
          },
        },
      },
      sets: {
        columns: {
          slot1GamesWon: true,
          slot2GamesWon: true,
        },
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
      slot1GameTeam: {
        with: {
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: { id: true, name: true, image: true },
                  },
                },
              },
            },
          },
        },
      },
      slot2GameTeam: {
        with: {
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: { id: true, name: true, image: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const teamIds = new Set(myGameTeamIds);
  const played: CompletedMatchForStats[] = [];
  for (const match of completedMatches) {
    const game = match.game;
    if (!game || game.cancelledAt != null) {
      continue;
    }
    const userSlot = userSlotOnMatch(match, teamIds);
    if (userSlot == null) {
      continue;
    }
    played.push({
      matchId: match.id,
      createdAt: match.createdAt,
      displayTime: match.startTime ?? gameListTime(game),
      userSlot,
      sets: match.sets,
      slot1Players: playersOnSlot(match.slot1GameTeam),
      slot2Players: playersOnSlot(match.slot2GameTeam),
    });
  }
  return played;
}
