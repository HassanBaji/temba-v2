import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, gameTeamPlayers, gameTeams } from "@repo/db";

import { isPoolTournament } from "~/lib/tournament-rounds";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { assertPoolDrawNotPosted } from "~/server/games/assert-pool-draw-not-posted";
import { clearMatchSlotsForGameTeam } from "~/server/games/clear-match-slots-for-game-team";
import type { SeatPosition } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SAME_POSITION_MESSAGE = "Both Users would play the same Position";
const NOT_HALF_TEAM_MESSAGE = "Both Game teams must be Half teams";

async function requireHalfTeam(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
) {
  const team = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.id, gameTeamId), eq(gameTeams.gameId, gameId)),
    with: {
      players: {
        columns: { id: true, gamePlayerId: true, position: true },
      },
    },
  });
  if (!team) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Game team is not on this Game",
    });
  }
  if (team.players.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: NOT_HALF_TEAM_MESSAGE,
    });
  }
  const link = team.players[0];
  if (!link || (link.position !== "left" && link.position !== "right")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: NOT_HALF_TEAM_MESSAGE,
    });
  }
  const player = await database.query.gamePlayers.findFirst({
    where: eq(gamePlayers.id, link.gamePlayerId),
    columns: { id: true, userId: true },
  });
  if (!player?.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: NOT_HALF_TEAM_MESSAGE,
    });
  }
  return {
    team,
    link,
    player: { id: player.id, userId: player.userId },
  };
}

export async function mergeHalfTeams(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: SeatPosition;
    secondPosition: SeatPosition;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot merge Half teams on a cancelled Game",
    });
  }
  if (!isPoolTournament(game.format, game.poolCount)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Merge Half teams on a Friendly tournament",
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Merge Half teams on an individual Friendly tournament",
    });
  }
  assertPoolDrawNotPosted(game);

  if (args.firstGameTeamId === args.secondGameTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick two different Half teams",
    });
  }
  if (args.firstPosition === args.secondPosition) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SAME_POSITION_MESSAGE,
    });
  }

  const first = await requireHalfTeam(database, game.id, args.firstGameTeamId);
  const second = await requireHalfTeam(
    database,
    game.id,
    args.secondGameTeamId,
  );
  if (first.player.userId === second.player.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: NOT_HALF_TEAM_MESSAGE,
    });
  }

  const now = new Date();
  await database.transaction(async (tx: Tx) => {
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.id, first.link.id));
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.id, second.link.id));
    await tx.insert(gameTeamPlayers).values({
      gameTeamId: first.team.id,
      gamePlayerId: first.player.id,
      position: args.firstPosition,
    });
    await tx.insert(gameTeamPlayers).values({
      gameTeamId: first.team.id,
      gamePlayerId: second.player.id,
      position: args.secondPosition,
    });
    await clearMatchSlotsForGameTeam(tx, second.team.id);
    await tx.delete(gameTeams).where(eq(gameTeams.id, second.team.id));
    await tx
      .update(gameTeams)
      .set({ teamId: null, updatedAt: now })
      .where(eq(gameTeams.id, first.team.id));
  });

  return { ok: true as const, gameTeamId: first.team.id };
}

export const mergeHalfTeamsInputSchema = z.object({
  gameId: z.string().uuid(),
  firstGameTeamId: z.string().uuid(),
  secondGameTeamId: z.string().uuid(),
  firstPosition: z.enum(["left", "right"]),
  secondPosition: z.enum(["left", "right"]),
});

export const mergeHalfTeamsProcedure = protectedProcedure
  .input(mergeHalfTeamsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mergeHalfTeams(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      firstGameTeamId: input.firstGameTeamId,
      secondGameTeamId: input.secondGameTeamId,
      firstPosition: input.firstPosition,
      secondPosition: input.secondPosition,
    });
  });
