import { TRPCError } from "@trpc/server";

import { MatchStatusEnum } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type GameRow } from "#src/games/access";
import { bothSlotsFilled } from "#src/games/both-slots-filled";
import { assertKnockoutMatchHasBothSides } from "#src/games/knockout-advance";
import { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
import { type MatchRow } from "#src/games/utils";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A football Score and a drawn tournament's games won have their own doors
 * (`saveFootballScore`, `enterTournamentScore`) with their own confirmation
 * rules, which the generic Set doors would bypass.
 */
export function scoredWithOwnDoor(
  game: Pick<GameRow, "sport" | "format" | "poolCount" | "tournamentShape">,
) {
  return (
    isFootballGame(game) ||
    isDrawnTournament(game.format, game.poolCount, game.tournamentShape)
  );
}

function assertMatchAllowsSets(
  game: GameRow,
  match: MatchRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.americanoNoSets,
    });
  }
  if (scoredWithOwnDoor(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: isFootballGame(game)
        ? messagesFor(locale).game.errors.footballScoreDoor
        : messagesFor(locale).game.errors.tournamentScoreDoor,
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.setsCancelledMatch,
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.setsFrozen,
    });
  }
  assertKnockoutMatchHasBothSides(match, locale);
}

export async function assertMayWriteSets(
  database: DbClient,
  game: GameRow,
  match: MatchRow,
  userId: string,
  organizer: boolean,
  locale: Locale = DEFAULT_LOCALE,
) {
  assertMatchAllowsSets(game, match, locale);
  if (organizer) {
    return;
  }
  if (!bothSlotsFilled(match)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.setShellOrganizer,
    });
  }
  if (!(await userIsOnMatchSlots(database, match, userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.setsOrganizerOrPlayers,
    });
  }
}
