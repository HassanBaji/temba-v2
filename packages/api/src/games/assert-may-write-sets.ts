import { TRPCError } from "@trpc/server";

import { MatchStatusEnum } from "@repo/db";

import { isFootballGame } from "@repo/domain/game-shape";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";

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

function assertMatchAllowsSets(game: GameRow, match: MatchRow) {
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Sets this slice",
    });
  }
  if (scoredWithOwnDoor(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: isFootballGame(game)
        ? "Enter a football Score with saveFootballScore"
        : "Enter a tournament score with enterTournamentScore",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot change Sets on a cancelled Match",
    });
  }
  if (match.status === MatchStatusEnum.COMPLETED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Match is completed; Sets are frozen",
    });
  }
  assertKnockoutMatchHasBothSides(match);
}

export async function assertMayWriteSets(
  database: DbClient,
  game: GameRow,
  match: MatchRow,
  userId: string,
  organizer: boolean,
) {
  assertMatchAllowsSets(game, match);
  if (organizer) {
    return;
  }
  if (!bothSlotsFilled(match)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an organizer can add a Set shell while slots are empty",
    });
  }
  if (!(await userIsOnMatchSlots(database, match, userId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only the organizer or Users on this Match’s Game teams can do that",
    });
  }
}
