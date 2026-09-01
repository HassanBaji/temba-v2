import { TRPCError } from "@trpc/server";

import { matches } from "@repo/db";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { applyMatchSides } from "~/server/games/helpers/apply-match-sides";
import { matchTimes } from "~/server/games/helpers/match-times";
import { type TournamentMatchInput } from "~/server/games/utils";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function addTournamentMatch(
  database: Tx,
  game: GameRow,
  input: TournamentMatchInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot add a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Add Matches on a Friendly tournament",
    });
  }
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      ...values,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Match",
    });
  }
  return match;
}

export async function addMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    startTime: Date | null;
    endTime: Date | null;
    durationInMinutes: number | null;
    courtId: string | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  return database.transaction(async (tx) => {
    return addTournamentMatch(tx, game, {
      startTime: args.startTime,
      endTime: args.endTime,
      durationInMinutes: args.durationInMinutes,
      courtId: args.courtId,
      slot1GameTeamId: args.slot1GameTeamId,
      slot2GameTeamId: args.slot2GameTeamId,
    });
  });
}
