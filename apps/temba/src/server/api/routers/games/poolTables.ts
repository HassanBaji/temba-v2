import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams, matches } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { canViewGame, requireGame } from "~/server/games/access";
import {
  computePoolTables,
  type ComputedPoolTables,
} from "~/server/games/pool-table";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const poolTablesInputSchema = z.object({
  gameId: z.string().uuid(),
});

export async function listPoolTables(
  database: DbClient,
  args: { gameId: string; userId: string },
): Promise<ComputedPoolTables | null> {
  const game = await requireGame(database, args.gameId);
  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found",
    });
  }

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      players: {
        with: {
          gamePlayer: {
            with: {
              user: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });
  const matchRows = await database.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    with: {
      sets: {
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
    },
  });

  return computePoolTables({
    format: game.format,
    poolCount: game.poolCount,
    viewerUserId: args.userId,
    gameTeams: teamRows.map((row) => ({
      id: row.id,
      name: row.name,
      sideIndex: row.sideIndex,
      poolIndex: row.poolIndex,
      members: row.players.flatMap((link) =>
        link.gamePlayer.user
          ? [{ id: link.gamePlayer.user.id, name: link.gamePlayer.user.name }]
          : [],
      ),
    })),
    matches: matchRows.map((match) => ({
      id: match.id,
      status: match.status,
      roundNumber: match.roundNumber,
      startTime: match.startTime,
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
      sets: match.sets.map((set) => ({
        slot1GamesWon: set.slot1GamesWon,
        slot2GamesWon: set.slot2GamesWon,
      })),
    })),
  });
}

export const poolTablesProcedure = protectedProcedure
  .input(poolTablesInputSchema)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listPoolTables(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
    });
  });
