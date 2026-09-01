import { TRPCError } from "@trpc/server";

import {
  assertGameOrganizer,
  requireGame,
  type GameRow,
} from "~/server/games/access";
import { updateFriendlyGameMatchCourt } from "~/server/games/update-friendly-game-match-court";
import { updateTournamentMatch } from "~/server/games/update-tournament-match";
import { type MatchUpdateInput } from "~/server/games/utils";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function hasTimesOrSlots(input: MatchUpdateInput) {
  return (
    input.startTime !== undefined ||
    input.endTime !== undefined ||
    input.durationInMinutes !== undefined ||
    input.slot1GameTeamId !== undefined ||
    input.slot2GameTeamId !== undefined
  );
}

export async function updateGameMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
  input: MatchUpdateInput,
) {
  if (game.format === "friendly_game") {
    if (hasTimesOrSlots(input)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change times or slots on a Friendly game",
      });
    }
    await updateFriendlyGameMatchCourt(
      database,
      game,
      matchId,
      input.courtId ?? null,
    );
    return;
  }

  await updateTournamentMatch(database, game, matchId, {
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    durationInMinutes: input.durationInMinutes ?? null,
    courtId: input.courtId ?? null,
    slot1GameTeamId: input.slot1GameTeamId ?? null,
    slot2GameTeamId: input.slot2GameTeamId ?? null,
  });
}

export async function updateMatch(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    matchId: string;
    startTime?: Date | null;
    endTime?: Date | null;
    durationInMinutes?: number | null;
    courtId?: string | null;
    slot1GameTeamId?: string | null;
    slot2GameTeamId?: string | null;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await database.transaction(async (tx) => {
    await updateGameMatch(tx, game, args.matchId, {
      startTime: args.startTime,
      endTime: args.endTime,
      durationInMinutes: args.durationInMinutes,
      courtId: args.courtId,
      slot1GameTeamId: args.slot1GameTeamId,
      slot2GameTeamId: args.slot2GameTeamId,
    });
  });
  return { ok: true as const };
}
