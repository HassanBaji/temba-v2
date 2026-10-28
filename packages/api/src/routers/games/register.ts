import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers } from "@repo/db";

import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  isFootballGame,
  isRosterRegistrationGame,
} from "@repo/domain/game-shape";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertUserPassesJoinGate, requireGame } from "#src/games/access";
import { admit } from "#src/games/admit";
import { throwIfAdmitRefused } from "#src/games/helpers/throw-if-admit-refused";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import { enqueueWaitlistUser } from "#src/games/enqueue-waitlist-user";
import { assertKeeperSeatOpen } from "#src/games/football-lineup";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function register(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    football?: { role: FootballRole; position: FootballPosition };
  },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();

  if (!isRosterRegistrationGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Register as yourself on an Americano or a football Game",
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is team-only",
    });
  }

  if (args.football && !isFootballGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a football Game takes a role and position",
    });
  }

  await assertUserPassesJoinGate(database, game, args.userId);

  if (await userAlreadyOnGame(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }

  if (args.football?.role === "keeper") {
    await assertKeeperSeatOpen(database, game.id);
  }

  return database.transaction(async (tx) => {
    const admitted = await admit(tx, {
      game,
      door: "register",
      party: { kind: "user", userId: args.userId },
      now,
    });
    if (!admitted.ok) {
      if (admitted.reason === "full") {
        await enqueueWaitlistUser(tx, game.id, args.userId);
        return { ok: true as const, waitlisted: true as const };
      }
      throwIfAdmitRefused(admitted);
    }
    if (args.football) {
      await tx
        .update(gamePlayers)
        .set({
          footballRole: args.football.role,
          footballPosition: args.football.position,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(gamePlayers.gameId, game.id),
            eq(gamePlayers.userId, args.userId),
          ),
        );
    }
    return { ok: true as const, waitlisted: false as const };
  });
}

export const registerProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      football: z
        .object({
          role: footballRoleSchema,
          position: footballPositionSchema,
        })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return register(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      football: input.football,
    });
  });
