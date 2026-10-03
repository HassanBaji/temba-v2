import { and, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gamePlayers, matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import {
  outcomeForSlot,
  scoredSetsFromMatch,
  slotMembers,
  userSlotOnMatch,
  type MatchSlotMember,
} from "~/server/games/match-slots";
import { gameListTime, isGameLive } from "~/server/home/upcoming-games";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export type MatchHistoryMember = MatchSlotMember;

export type MatchHistoryRow = {
  id: string;
  name: string | null;
  format: string;
  venue: { name: string };
  displayTime: Date;
  matchId: string;
  groupName: string | null;
  slot1Members: MatchHistoryMember[];
  slot2Members: MatchHistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  /** Slot the signed-in User sat on, so cards can read scores as us-vs-them. */
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
};

/**
 * Past Matches the signed-in User sat on via a completed Match slot.
 * Soft-archived Club Group Games are included when they otherwise qualify.
 * Friendly games appear once the Game is no longer live, one row per Game.
 * Friendly tournament Pool Matches appear as they complete, one row each.
 * Americano is excluded this slice.
 */
export async function listMyMatchHistoryRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<MatchHistoryRow[]> {
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
          name: true,
          format: true,
          groupId: true,
          cancelledAt: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
        },
        with: {
          group: {
            columns: { name: true },
          },
          venue: {
            columns: { name: true },
          },
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

  const byGameId = new Map<string, typeof completedMatches>();
  for (const match of completedMatches) {
    if (!match.game) {
      continue;
    }
    const list = byGameId.get(match.game.id) ?? [];
    list.push(match);
    byGameId.set(match.game.id, list);
  }

  const rows: MatchHistoryRow[] = [];
  for (const gameMatches of byGameId.values()) {
    const game = gameMatches[0]?.game;
    if (!game) {
      continue;
    }
    if (game.format === "americano") {
      continue;
    }
    if (
      game.format !== "friendly_game" &&
      game.format !== "friendly_tournament"
    ) {
      continue;
    }
    if (game.cancelledAt != null) {
      continue;
    }
    if (
      game.format === "friendly_game" &&
      isGameLive(
        {
          id: game.id,
          groupId: game.groupId,
          cancelledAt: game.cancelledAt,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          createdAt: game.createdAt,
          format: game.format,
          matches: game.matches,
        },
        now,
      )
    ) {
      continue;
    }

    const myTeams = new Set(myGameTeamIds);
    const candidates: {
      match: (typeof gameMatches)[number];
      userSlot: 1 | 2;
      outcome: "won" | "lost" | "draw";
      displayTime: Date;
    }[] = [];
    for (const match of gameMatches) {
      const userSlot = userSlotOnMatch(match, myTeams);
      if (userSlot == null) {
        continue;
      }
      const outcome = outcomeForSlot(userSlot, matchOutcome(match.sets).result);
      if (outcome == null) {
        continue;
      }
      candidates.push({
        match,
        userSlot,
        outcome,
        displayTime: match.startTime ?? gameListTime(game),
      });
    }
    candidates.sort((a, b) => {
      const timeDelta = b.displayTime.getTime() - a.displayTime.getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return b.match.createdAt.getTime() - a.match.createdAt.getTime();
    });
    const chosenMatches =
      game.format === "friendly_tournament"
        ? candidates
        : candidates.slice(0, 1);
    const venueName = game.venue?.name;
    if (!venueName) {
      continue;
    }
    for (const chosen of chosenMatches) {
      rows.push({
        id: game.id,
        name: game.name,
        format: game.format,
        venue: { name: venueName },
        displayTime: chosen.displayTime,
        matchId: chosen.match.id,
        groupName: game.group?.name ?? null,
        slot1Members: slotMembers(chosen.match.slot1GameTeam, userId),
        slot2Members: slotMembers(chosen.match.slot2GameTeam, userId),
        scoredSets: scoredSetsFromMatch(chosen.match.sets),
        viewerSlot: chosen.userSlot,
        outcome: chosen.outcome,
      });
    }
  }

  return rows.sort((a, b) => b.displayTime.getTime() - a.displayTime.getTime());
}

export const listMyMatchHistory = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMyMatchHistoryRows(ctx.db, appUser.id);
});
