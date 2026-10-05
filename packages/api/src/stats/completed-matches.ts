import type { DbClient } from "@repo/db";
import { and, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gamePlayers, matches } from "@repo/db";

import {
  slotMembers,
  userSlotOnMatch,
  type MatchSlotTeam,
} from "@repo/domain/match-slots";
import {
  type CompletedMatchForStats,
  type CompletedMatchSlotPlayer,
} from "@repo/domain/completed-matches";
import { gameListTime } from "#src/home/upcoming-games";

function playersOnSlot(team: MatchSlotTeam): CompletedMatchSlotPlayer[] {
  return slotMembers(team, null).map((member) => ({
    userId: member.id,
    name: member.name,
  }));
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
