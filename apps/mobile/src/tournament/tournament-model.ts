import { gameTeamDisplayName } from "@repo/domain/game-side-label";
import type {
  TournamentDetails,
  TournamentDetailsMatch,
} from "@repo/domain/tournament-details";
import {
  knockoutMatchCode,
  knockoutRoundName,
} from "@repo/domain/tournament-knockout";
import { KNOCKOUT_DECIDING_SET_COPY } from "@repo/domain/tournament-knockout-view";

export type ScorableMatch = {
  id: string;
  heading: string;
  slot1Label: string;
  slot2Label: string;
  sets: TournamentDetailsMatch["sets"];
  needsDecidingSet: boolean;
  note: string | null;
};

function teamLabel(game: TournamentDetails, gameTeamId: string | null) {
  const team = game.gameTeams.find((entry) => entry.id === gameTeamId);
  return team ? gameTeamDisplayName(team) : "Open";
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
) {
  if (match.knockoutRound != null) {
    const roundCount = knockoutRoundCount(game);
    if (match.knockoutPosition != null && roundCount > 0) {
      const code = knockoutMatchCode(
        match.knockoutRound,
        match.knockoutPosition,
        roundCount,
      );
      const roundName = knockoutRoundName(match.knockoutRound, roundCount);
      return code === roundName ? roundName : `${roundName}, ${code}`;
    }
    return "Knockout";
  }
  return match.roundNumber != null ? `Round ${match.roundNumber}` : "Match";
}

export function scorableMatches(game: TournamentDetails): ScorableMatch[] {
  return game.matches
    .filter((match) => match.canScoreSets)
    .map((match) => {
      const needsDecidingSet =
        match.knockoutRound != null && match.outcome.result === "draw";
      return {
        id: match.id,
        heading: matchHeading(game, match),
        slot1Label: teamLabel(game, match.slot1GameTeamId),
        slot2Label: teamLabel(game, match.slot2GameTeamId),
        sets: match.sets,
        needsDecidingSet,
        note: needsDecidingSet ? KNOCKOUT_DECIDING_SET_COPY : null,
      };
    });
}

export const SCORE_SECTION_TITLE = "Score your Matches";
export const SCORE_SECTION_NOTE =
  "Enter the games each team won in every Set, then complete the Match.";
export const COMPLETE_FAILED_FALLBACK = "Could not complete the Match";
