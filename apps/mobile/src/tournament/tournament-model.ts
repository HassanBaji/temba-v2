import { gameTeamDisplayName } from "@repo/domain/game-side-label";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type {
  TournamentDetails,
  TournamentDetailsMatch,
} from "@repo/domain/tournament-details";
import {
  knockoutMatchLabel,
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
  canEnter: boolean;
  /** The other team's pending score, for the viewer to confirm (ADR-0062). */
  scoreToConfirm: string | null;
  /** The viewer is a Verifier who may stamp the entered score (ADR-0072). */
  canStamp: boolean;
};

function pendingScore(match: TournamentDetailsMatch) {
  const [set] = match.sets;
  if (
    !match.canConfirmScore ||
    set?.slot1GamesWon == null ||
    set.slot2GamesWon == null
  ) {
    return null;
  }
  return `${set.slot1GamesWon}–${set.slot2GamesWon}`;
}

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
      const label = knockoutMatchLabel(
        match.knockoutRound,
        match.knockoutPosition,
        roundCount,
        locale,
        "short",
      );
      const roundName = knockoutRoundName(
        match.knockoutRound,
        roundCount,
        locale,
      );
      return label === roundName
        ? roundName
        : m.mobileTournament.model.knockoutHeading(roundName, label);
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
    .filter(
      (match) =>
        match.canScoreSets ||
        pendingScore(match) != null ||
        match.canStamp === true,
    )
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
        canEnter: match.canScoreSets,
        scoreToConfirm: pendingScore(match),
        canStamp: match.canStamp === true,
      };
    });
}

export type TournamentPlayer = {
  userId: string;
  name: string;
  image: string | null;
  level: string | null;
  guest: boolean;
};

/** A seated or drawn player on the Tournament, looked up by user id. */
export function tournamentPlayer(
  game: Pick<TournamentDetails, "sides" | "gameTeams">,
  userId: string,
): TournamentPlayer | null {
  for (const side of game.sides) {
    for (const occupant of [side.left, side.right]) {
      if (occupant?.userId === userId) {
        return {
          userId,
          name: occupant.name,
          image: occupant.image ?? null,
          level: occupant.levelBand
            ? displayLabelFromStoredBand(occupant.levelBand)
            : null,
          guest: "guest" in occupant && occupant.guest === true,
        };
      }
    }
  }
  for (const team of game.gameTeams) {
    const member = team.members.find((candidate) => candidate.id === userId);
    if (member) {
      return {
        userId,
        name: member.name,
        image: member.image,
        level: null,
        guest: "guest" in member && member.guest === true,
      };
    }
  }
  return null;
}
