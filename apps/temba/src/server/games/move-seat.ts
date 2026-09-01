import { TRPCError } from "@trpc/server";

import {
  assertRegistrationOpen,
  getRegistrationStatus,
  requireGame,
} from "~/server/games/access";
import { isIndividualSeatGame, moveToSeat } from "~/server/games/seats";
import { type db } from "~/server/db";
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
