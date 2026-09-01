import { TRPCError } from "@trpc/server";

import {
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  type GameRow,
} from "~/server/games/access";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertCanRegisterWithPartner(
  database: DbClient,
  game: GameRow,
  userId: string,
  now: Date,
) {
  if (
    game.format !== "friendly_game" &&
    game.format !== "friendly_tournament"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Register with a partner on a Friendly game or tournament",
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is team-only; register a complete Team",
    });
  }

  await assertRegistrationOpen(database, game, now);
  await assertUserPassesJoinGate(database, game, userId);

  if (await userAlreadyOnGame(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }
}
