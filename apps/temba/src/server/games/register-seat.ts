import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeamPlayers } from "@repo/db";

import { assertUserPassesJoinGate, requireGame } from "~/server/games/access";
import { admit } from "~/server/games/admit";
import { throwIfAdmitRefused } from "~/server/games/helpers/throw-if-admit-refused";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import {
  isIndividualSeatGame,
  occupySeat,
  remainingCapacity,
} from "~/server/games/seats";
import { enqueueWaitlistUser } from "~/server/games/waitlist";
import { type db } from "~/server/db";
import type { SeatPosition } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registerSeat(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    sideIndex?: number;
    position?: SeatPosition;
  },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();

  if (!isIndividualSeatGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a seat on an individual Friendly game or tournament",
    });
  }

  await assertUserPassesJoinGate(database, game, args.userId);

  const existingPlayer = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, game.id),
      eq(gamePlayers.userId, args.userId),
    ),
  });
  if (existingPlayer) {
    const seated = await database.query.gameTeamPlayers.findFirst({
      where: eq(gameTeamPlayers.gamePlayerId, existingPlayer.id),
      columns: { id: true },
    });
    if (seated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already registered on this Game",
      });
    }
    if (args.sideIndex == null || args.position == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pick a vacant Position",
      });
    }
    const leftoverSideIndex = args.sideIndex;
    const leftoverPosition = args.position;
    await database.transaction(async (tx) => {
      await occupySeat(
        tx,
        game,
        args.userId,
        leftoverSideIndex,
        leftoverPosition,
        existingPlayer.id,
      );
    });
    return { ok: true as const, waitlisted: false as const };
  }

  if (await userAlreadyWaitlisted(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }

  if ((await remainingCapacity(database, game)) <= 0) {
    await enqueueWaitlistUser(database, game.id, args.userId);
    return { ok: true as const, waitlisted: true as const };
  }

  if (args.sideIndex == null || args.position == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick a vacant Position",
    });
  }
  const sideIndex = args.sideIndex;
  const position = args.position;

  await database.transaction(async (tx) => {
    throwIfAdmitRefused(
      await admit(tx, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: args.userId,
          seat: { sideIndex, position },
        },
        now,
      }),
    );
  });
  return { ok: true as const, waitlisted: false as const };
}
