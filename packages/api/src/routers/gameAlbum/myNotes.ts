import { and, desc, eq, inArray, or } from "drizzle-orm";

import { MatchStatusEnum, gameNotes, gamePlayers, matches } from "@repo/db";
import type { MyGameNote } from "@repo/domain/game-album";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  outcomeForSlot,
  scoredSetsFromMatch,
  slotMembers,
  userSlotOnMatch,
} from "@repo/domain/match-slots";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Enough for years of play; Your notes is one page. */
const MY_NOTES_LIMIT = 500;

type GameResult = Pick<MyGameNote["game"], "outcome" | "sets" | "partnerNames">;

const NO_RESULT: GameResult = { outcome: null, sets: [], partnerNames: [] };

const teamWithUsers = {
  with: {
    players: {
      with: {
        gamePlayer: {
          with: { user: { columns: { id: true, name: true, image: true } } },
        },
      },
    },
  },
} as const;

/** The viewer's latest completed Match on each Game: outcome, Sets read us-first, partners. */
async function viewerResults(
  database: DbClient,
  userId: string,
  gameIds: string[],
): Promise<Map<string, GameResult>> {
  const results = new Map<string, GameResult>();
  if (gameIds.length === 0) {
    return results;
  }
  const seats = await database.query.gamePlayers.findMany({
    where: and(
      eq(gamePlayers.userId, userId),
      inArray(gamePlayers.gameId, gameIds),
    ),
    columns: { id: true },
    with: { gameTeamPlayers: { columns: { gameTeamId: true } } },
  });
  const myTeams = new Set(
    seats.flatMap((seat) =>
      seat.gameTeamPlayers.map((link) => link.gameTeamId),
    ),
  );
  if (myTeams.size === 0) {
    return results;
  }
  const completed = await database.query.matches.findMany({
    where: and(
      inArray(matches.gameId, gameIds),
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, [...myTeams]),
        inArray(matches.slot2GameTeamId, [...myTeams]),
      ),
    ),
    columns: {
      id: true,
      gameId: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
    },
    orderBy: [desc(matches.startTime), desc(matches.createdAt)],
    with: {
      sets: {
        columns: { slot1GamesWon: true, slot2GamesWon: true },
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
      slot1GameTeam: teamWithUsers,
      slot2GameTeam: teamWithUsers,
    },
  });
  for (const match of completed) {
    if (!match.gameId || results.has(match.gameId)) {
      continue;
    }
    const slot = userSlotOnMatch(match, myTeams);
    if (slot == null) {
      continue;
    }
    const sets = scoredSetsFromMatch(match.sets).map((set) =>
      slot === 1
        ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
        : { us: set.slot2GamesWon, them: set.slot1GamesWon },
    );
    const myTeam = slot === 1 ? match.slot1GameTeam : match.slot2GameTeam;
    results.set(match.gameId, {
      outcome: outcomeForSlot(slot, matchOutcome(match.sets).result),
      sets,
      partnerNames: slotMembers(myTeam, userId)
        .filter((member) => !member.isViewer)
        .map((member) => member.name),
    });
  }
  return results;
}

/** Every note the viewer wrote, private and shared, each with its Game for context. */
export async function myNotes(
  database: DbClient,
  args: { userId: string },
): Promise<MyGameNote[]> {
  const rows = await database.query.gameNotes.findMany({
    where: eq(gameNotes.authorUserId, args.userId),
    orderBy: [desc(gameNotes.createdAt)],
    limit: MY_NOTES_LIMIT,
    with: {
      game: {
        columns: {
          id: true,
          name: true,
          hasCustomName: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
        },
        with: {
          venue: { columns: { name: true } },
          group: { columns: { name: true } },
        },
      },
    },
  });
  const results = await viewerResults(
    database,
    args.userId,
    rows.map((row) => row.gameId),
  );
  return rows.map((row) => ({
    id: row.id,
    gameId: row.gameId,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    game: {
      playedAt: row.game.windowStart ?? row.game.createdAt,
      venueName: row.game.venue?.name ?? null,
      groupName: row.game.group?.name ?? null,
      name: row.game.hasCustomName ? row.game.name : null,
      ...(results.get(row.gameId) ?? NO_RESULT),
    },
  }));
}

export const myNotesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return myNotes(ctx.db, { userId: appUser.id });
});
