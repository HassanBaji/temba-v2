import { gameTeamDisplayName } from "@repo/domain/game-side-label";
import type {
  TournamentDetails,
  TournamentDetailsMatch,
} from "@repo/domain/tournament-details";
import {
  knockoutMatchCode,
  knockoutRoundName,
} from "@repo/domain/tournament-knockout";
import { knockoutHeading } from "@repo/domain/tournament-knockout-view";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type ScorableMatch = {
  id: string;
  heading: string;
  slot1Label: string;
  slot2Label: string;
  sets: TournamentDetailsMatch["sets"];
  needsDecidingSet: boolean;
  note: string | null;
};

function teamLabel(
  game: TournamentDetails,
  gameTeamId: string | null,
  locale: Locale,
) {
  const team = game.gameTeams.find((entry) => entry.id === gameTeamId);
  return team
    ? gameTeamDisplayName(team, locale)
    : messagesFor(locale).tournament.details.open;
}

function knockoutRoundCount(game: Pick<TournamentDetails, "matches">) {
  return game.matches.reduce(
    (highest, match) => Math.max(highest, match.knockoutRound ?? 0),
    0,
  );
}

export function matchHeading(
  game: Pick<TournamentDetails, "matches">,
  match: Pick<
    TournamentDetailsMatch,
    "roundNumber" | "knockoutRound" | "knockoutPosition"
  >,
  locale: Locale,
) {
  const m = messagesFor(locale);
  if (match.knockoutRound != null) {
    const roundCount = knockoutRoundCount(game);
    if (match.knockoutPosition != null && roundCount > 0) {
      const code = knockoutMatchCode(
        match.knockoutRound,
        match.knockoutPosition,
        roundCount,
      );
      const roundName = knockoutRoundName(
        match.knockoutRound,
        roundCount,
        locale,
      );
      return code === roundName
        ? roundName
        : m.mobileTournament.model.knockoutHeading(roundName, code);
    }
    return knockoutHeading(locale);
  }
  return match.roundNumber != null
    ? m.tournament.details.roundN(match.roundNumber)
    : m.mobileTournament.model.matchFallback;
}

export function scorableMatches(
  game: TournamentDetails,
  locale: Locale,
): ScorableMatch[] {
  const decidingSet = messagesFor(locale).tournament.knockoutView.decidingSet;
  return game.matches
    .filter((match) => match.canScoreSets)
    .map((match) => {
      const needsDecidingSet =
        match.knockoutRound != null && match.outcome.result === "draw";
      return {
        id: match.id,
        heading: matchHeading(game, match, locale),
        slot1Label: teamLabel(game, match.slot1GameTeamId, locale),
        slot2Label: teamLabel(game, match.slot2GameTeamId, locale),
        sets: match.sets,
        needsDecidingSet,
        note: needsDecidingSet ? decidingSet : null,
      };
    });
}

export const COMPLETE_FAILED_FALLBACK = "Could not complete the Match";
