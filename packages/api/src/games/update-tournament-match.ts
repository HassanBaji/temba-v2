import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";

import { type GameRow } from "#src/games/access";
import { applyMatchSides } from "#src/games/helpers/apply-match-sides";
import { matchTimes } from "#src/games/helpers/match-times";
import {
  type MatchRow,
  type MatchUpdateInput,
  type TournamentMatchInput,
} from "#src/games/utils";
import { type db } from "#src/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const KNOCKOUT_MATCH_SIDES_MESSAGE =
  "The sides of a Knockout Match come from the draw";

export const SCORED_MATCH_SIDES_MESSAGE =
  "A Match with a score keeps its teams";

// `null` is a value the organizer sent (clear it); only `undefined` keeps
// the current one.
function given<T>(requested: T | undefined, current: T): T {
  if (requested === undefined) {
    return current;
  }
  return requested;
}

// A Knockout Match keeps the sides the tree gave it, and a Match with a score
// keeps the teams that played it; only its Court and time are the
// organizer's to change.
function matchSides(
  match: MatchRow,
  input: MatchUpdateInput,
  hasSets: boolean,
) {
  const sides = {
    slot1GameTeamId: given(input.slot1GameTeamId, match.slot1GameTeamId),
    slot2GameTeamId: given(input.slot2GameTeamId, match.slot2GameTeamId),
  };
  const changed =
    sides.slot1GameTeamId !== match.slot1GameTeamId ||
    sides.slot2GameTeamId !== match.slot2GameTeamId;
  if (!changed) {
    return sides;
  }
  if (match.knockoutRound != null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: KNOCKOUT_MATCH_SIDES_MESSAGE,
    });
  }
  if (
    match.status !== MatchStatusEnum.PENDING ||
    hasSets ||
    match.notFinishedAt != null
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: SCORED_MATCH_SIDES_MESSAGE,
    });
  }
  return sides;
}

// Only the fields the organizer sent change. A new start or end without a
// duration takes its duration from the two times.
function patchedTimes(match: MatchRow, input: MatchUpdateInput) {
  const timesChange =
    input.startTime !== undefined || input.endTime !== undefined;
  return {
    startTime: given(input.startTime, match.startTime),
    endTime: given(input.endTime, match.endTime),
    durationInMinutes: given(
      input.durationInMinutes,
      timesChange ? null : match.durationInMinutes,
    ),
    courtId: given(input.courtId, match.courtId),
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
  const [match] = await database
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .for("update");
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
  const set = await database.query.matchSets.findFirst({
    where: eq(matchSets.matchId, match.id),
    columns: { id: true },
  });
  const input: TournamentMatchInput = {
    ...patchedTimes(match, update),
    ...matchSides(match, update, set != null),
  };
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  await database
    .update(matches)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
