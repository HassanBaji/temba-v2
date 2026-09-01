import { TRPCError } from "@trpc/server";

import { MatchStatusEnum } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { bothSlotsFilled } from "~/server/games/both-slots-filled";
import { userIsOnMatchSlots } from "~/server/games/user-is-on-match-slots";
import { type MatchRow } from "~/server/games/utils";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function assertMatchAllowsSets(game: GameRow, match: MatchRow) {
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Sets this slice",
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
