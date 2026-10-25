import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers } from "@repo/db";

import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import {
  assertFootballGame,
  assertGameNotCancelled,
  assertKeeperSeatOpen,
} from "#src/games/football-lineup";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A registered player changes how they want to play: keeper or outfield, and
 * the outfield position they prefer. A preference, never a promise: the
 * Organizer still makes the teams.
 */
export async function setFootballRole(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    role: FootballRole;
    position: FootballPosition;
  },
) {
  const game = await requireGame(database, args.gameId);
  assertFootballGame(game);
  assertGameNotCancelled(game);
  const player = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, game.id),
      eq(gamePlayers.userId, args.userId),
    ),
    columns: { id: true, footballRole: true },
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not registered on this Game",
    });
  }
  if (args.role === "keeper" && player.footballRole !== "keeper") {
    await assertKeeperSeatOpen(database, game.id, args.userId);
  }
  await database
    .update(gamePlayers)
    .set({
      footballRole: args.role,
      footballPosition: args.position,
      updatedAt: new Date(),
    })
    .where(eq(gamePlayers.id, player.id));
  return { ok: true as const };
}

export const setFootballRoleProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      role: footballRoleSchema,
      position: footballPositionSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setFootballRole(ctx.db, { ...input, userId: appUser.id });
  });
