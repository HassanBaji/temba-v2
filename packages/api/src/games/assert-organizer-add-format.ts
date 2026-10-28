import { TRPCError } from "@trpc/server";

import type { GameRow } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";

export const ORGANIZER_ADD_TEAM_ONLY_MESSAGE = "This Game is team-only";

/** Individual Games of every format, and a tournament only before its Pool draw. */
export function assertOrganizerAddFormat(game: GameRow) {
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ORGANIZER_ADD_TEAM_ONLY_MESSAGE,
    });
  }
  assertPoolDrawNotPosted(game);
}
