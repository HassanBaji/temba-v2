import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches, matchSets } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

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
  locale: Locale = DEFAULT_LOCALE,
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
      message: messagesFor(locale).tournament.errors.knockoutSidesFromDraw,
    });
  }
  if (
    match.status !== MatchStatusEnum.PENDING ||
    hasSets ||
    match.notFinishedAt != null
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).tournament.errors.scoredMatchKeepsTeams,
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
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchOnCancelledGame,
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.editMatchesFriendly,
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
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchCancelledEdit,
    });
  }
  const set = await database.query.matchSets.findFirst({
    where: eq(matchSets.matchId, match.id),
    columns: { id: true },
  });
  const input: TournamentMatchInput = {
    ...patchedTimes(match, update),
    ...matchSides(match, update, set != null, locale),
  };
  await applyMatchSides(database, game.id, input, locale);
  const values = matchTimes(input);
  await database
    .update(matches)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
