import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  assertRegistrationOpen,
  getRegistrationStatus,
  requireGame,
} from "~/server/games/access";
import { isIndividualSeatGame, moveToSeat } from "~/server/games/seats";
import type { SeatPosition } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function moveSeat(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    sideIndex: number;
    position: SeatPosition;
  },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();

  if (!isIndividualSeatGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Move a seat on an individual Friendly game or tournament",
    });
  }

  await assertRegistrationOpen(database, game, now);
  const status = await getRegistrationStatus(database, game, now);
  if (status === "full") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No vacant Position",
    });
  }

  await database.transaction(async (tx) => {
    await moveToSeat(tx, game, args.userId, args.sideIndex, args.position);
  });
  return { ok: true as const };
}

export const moveSeatProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      sideIndex: z.number().int().min(1),
      position: z.enum(["left", "right"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return moveSeat(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
    });
  });
