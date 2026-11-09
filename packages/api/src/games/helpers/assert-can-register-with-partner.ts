import { type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { TRPCError } from "@trpc/server";

import {
  assertGameNotFrozen,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  type GameRow,
} from "#src/games/access";
import { assertGameHasSeats } from "#src/games/seats";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertCanRegisterWithPartner(
  database: DbClient,
  game: GameRow,
  userId: string,
  now: Date,
  locale: Locale,
) {
  if (
    game.format !== "friendly_game" &&
    game.format !== "friendly_tournament"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.partnerFriendlyOnly,
    });
  }
  assertGameHasSeats(game, locale);
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.teamOnlyRegisterTeam,
    });
  }

  assertRegistrationOpen(game, now, locale);
  await assertGameNotFrozen(database, game, now, locale);
  await assertUserPassesJoinGate(database, game, userId, locale);

  if (await userAlreadyOnGame(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.alreadyRegistered,
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.alreadyWaitlisted,
    });
  }
}
