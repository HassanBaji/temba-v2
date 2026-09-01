import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { games } from "@repo/db";

import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  assertGameOrganizer,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { highestOccupiedSideIndex } from "~/server/games/seats";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function updateGameCapsOnGame(
  database: DbClient,
  game: GameRow,
  input: { playersAllowed?: number; teamsAllowed?: number },
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
    });
  }
  if (game.format === "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Friendly game caps are fixed at 4 players / 2 Teams",
    });
  }

  const nextPlayers = input.playersAllowed ?? game.playersAllowed;
  const nextTeams = input.teamsAllowed ?? game.teamsAllowed;

  if (game.registrationMode === "team_only") {
    if (nextTeams == null || nextTeams < FRIENDLY_TEAMS_ALLOWED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Teams allowed must be at least 2",
      });
    }
    const teamCount = await registeredGameTeamCount(database, game.id);
    if (nextTeams < teamCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot lower cap below the current registered count",
      });
    }
    await database
      .update(games)
      .set({ teamsAllowed: nextTeams, updatedAt: new Date() })
      .where(eq(games.id, game.id));
    return;
  }

  if (nextPlayers == null || nextPlayers < FRIENDLY_PLAYERS_ALLOWED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Players allowed must be at least 4",
    });
  }
  if (nextPlayers % 4 !== 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Players allowed must be a multiple of 4",
    });
  }
  const userCount = await registeredUserCount(database, game.id);
  if (nextPlayers < userCount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot lower cap below the current registered count",
    });
  }
  if (game.format === "friendly_tournament") {
    const nextN = Math.floor(nextPlayers / 2);
    const highest = await highestOccupiedSideIndex(database, game.id);
    if (highest != null && highest > nextN) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot lower cap below the highest occupied side. Empty high-index placeholders may disappear; occupied ones may not.",
      });
    }
  }
  await database
    .update(games)
    .set({ playersAllowed: nextPlayers, updatedAt: new Date() })
    .where(eq(games.id, game.id));
}

export async function updateGameCaps(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    playersAllowed?: number;
    teamsAllowed?: number;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await updateGameCapsOnGame(database, game, {
    playersAllowed: args.playersAllowed,
    teamsAllowed: args.teamsAllowed,
  });
  return { ok: true as const };
}
