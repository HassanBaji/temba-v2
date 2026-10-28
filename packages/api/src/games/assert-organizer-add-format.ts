import { TRPCError } from "@trpc/server";

import type { GameRow } from "#src/games/access";
import { isIndividualSeatGame } from "#src/games/seats";

export const ORGANIZER_ADD_FORMAT_SOON_MESSAGE =
  "Adding players to this format arrives soon";

/** Padel Friendly games, Booking Games among them; other formats follow. */
export function assertOrganizerAddFormat(game: GameRow) {
  if (game.format === "friendly_game" && isIndividualSeatGame(game)) {
    return;
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: ORGANIZER_ADD_FORMAT_SOON_MESSAGE,
  });
}
