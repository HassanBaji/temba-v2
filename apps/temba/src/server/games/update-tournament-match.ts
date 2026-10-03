import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { applyMatchSides } from "~/server/games/helpers/apply-match-sides";
import { matchTimes } from "~/server/games/helpers/match-times";
import {
  type MatchRow,
  type MatchUpdateInput,
  type TournamentMatchInput,
} from "~/server/games/utils";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const KNOCKOUT_MATCH_SIDES_MESSAGE =
  "The sides of a Knockout Match come from the draw";

// A Knockout Match keeps the sides the tree gave it; only its Court and time
// are the organizer's to change.
function matchSides(match: MatchRow, input: MatchUpdateInput) {
  if (match.knockoutRound == null) {
    return {
      slot1GameTeamId: input.slot1GameTeamId ?? null,
      slot2GameTeamId: input.slot2GameTeamId ?? null,
    };
  }
  const changes = (
    requested: string | null | undefined,
    current: string | null,
  ) => requested !== undefined && requested !== current;
  if (
    changes(input.slot1GameTeamId, match.slot1GameTeamId) ||
    changes(input.slot2GameTeamId, match.slot2GameTeamId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: KNOCKOUT_MATCH_SIDES_MESSAGE,
    });
  }
  return {
    slot1GameTeamId: match.slot1GameTeamId,
    slot2GameTeamId: match.slot2GameTeamId,
  };
}

export async function updateTournamentMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
  update: MatchUpdateInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Edit Matches on a Friendly tournament",
    });
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Match",
    });
  }
  const input: TournamentMatchInput = {
    startTime: update.startTime ?? null,
    endTime: update.endTime ?? null,
    durationInMinutes: update.durationInMinutes ?? null,
    courtId: update.courtId ?? null,
    ...matchSides(match, update),
  };
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  await database
    .update(matches)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
