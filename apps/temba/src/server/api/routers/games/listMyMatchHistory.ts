import { and, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gamePlayers, matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { matchOutcome } from "~/server/games/match-outcome";
import { gameListTime, isGameLive } from "~/server/home/upcoming-games";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export type MatchHistoryMember = {
  id: string;
  name: string;
  image: string | null;
};

export type MatchHistoryRow = {
  id: string;
  name: string | null;
  format: string;
  venue: { name: string };
  displayTime: Date;
  matchId: string;
  slot1Members: MatchHistoryMember[];
  slot2Members: MatchHistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  outcome: "won" | "lost" | "draw";
};

type SlotTeam = {
  players: readonly {
    position: string | null;
    gamePlayer: {
      user: { id: string; name: string; image: string | null } | null;
    } | null;
  }[];
} | null;

function userSlotOnMatch(
  match: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  myGameTeamIds: ReadonlySet<string>,
): 1 | 2 | null {
  const onSlot1 =
    match.slot1GameTeamId != null && myGameTeamIds.has(match.slot1GameTeamId);
  const onSlot2 =
    match.slot2GameTeamId != null && myGameTeamIds.has(match.slot2GameTeamId);
  if (onSlot1 === onSlot2) {
    return null;
  }
  return onSlot1 ? 1 : 2;
}

function viewerOutcome(
  userSlot: 1 | 2,
  result: "slot1" | "slot2" | "draw" | "none",
): "won" | "lost" | "draw" | null {
  if (result === "none") {
    return null;
  }
  if (result === "draw") {
    return "draw";
  }
  if (userSlot === 1) {
    return result === "slot1" ? "won" : "lost";
  }
  return result === "slot2" ? "won" : "lost";
}

function membersFromSlot(team: SlotTeam): MatchHistoryMember[] {
  const players = [...(team?.players ?? [])].sort((left, right) => {
    const rank = (position: string | null) =>
      position === "left" ? 0 : position === "right" ? 1 : 2;
    return rank(left.position) - rank(right.position);
  });
  const members: MatchHistoryMember[] = [];
  for (const link of players) {
    const occupant = link.gamePlayer?.user;
    if (!occupant) {
      continue;
    }
    members.push({
      id: occupant.id,
      name: occupant.name,
      image: occupant.image,
    });
  }
  return members;
}

function scoredSetsFromMatch(
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[],
): { slot1GamesWon: number; slot2GamesWon: number }[] {
  const scored: { slot1GamesWon: number; slot2GamesWon: number }[] = [];
  for (const set of sets) {
    if (set.slot1GamesWon == null || set.slot2GamesWon == null) {
      continue;
    }
    scored.push({
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
  return scored;
}

/**
 * Past Friendly games the signed-in User sat on via a completed Match slot.
 * Soft-archived Club Group Games are included when they otherwise qualify.
 * Friendly tournament and Americano are excluded this slice.
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
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
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
    if (game.format !== "friendly_game") {
      continue;
    }
    if (game.cancelledAt != null) {
      continue;
    }
    if (
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
      const outcome = viewerOutcome(userSlot, matchOutcome(match.sets).result);
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
    const chosen = candidates[0];
    if (!chosen) {
      continue;
    }
    const venueName = game.venue?.name;
    if (!venueName) {
      continue;
    }

    rows.push({
      id: game.id,
      name: game.name,
      format: game.format,
      venue: { name: venueName },
      displayTime: chosen.displayTime,
      matchId: chosen.match.id,
      slot1Members: membersFromSlot(chosen.match.slot1GameTeam),
      slot2Members: membersFromSlot(chosen.match.slot2GameTeam),
      scoredSets: scoredSetsFromMatch(chosen.match.sets),
      outcome: chosen.outcome,
    });
  }

  return rows.sort((a, b) => b.displayTime.getTime() - a.displayTime.getTime());
}

export const listMyMatchHistory = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return listMyMatchHistoryRows(ctx.db, appUser.id);
});
