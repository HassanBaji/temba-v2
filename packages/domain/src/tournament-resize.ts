/**
 * Which team counts a Friendly tournament may change to before its seats
 * freeze. The count keeps the Tournament shape chosen at create: its Pools,
 * Round count and Qualifiers per Pool must still fit the new field.
 */

import {
  KING_COURT_MAX,
  KING_COURT_MIN,
  KING_OF_THE_COURT_SHAPE,
  KING_TEAMS_PER_COURT,
} from "./tournament-king";
import {
  ROUNDS_SHAPE_POOL_COUNT,
  TOURNAMENT_TEAM_COUNTS,
  sizeFriendlyTournament,
  tournamentTeamCountIssue,
  validateQualifiersPerPool,
  validateRoundCount,
  validateRoundsShapeRoundCount,
} from "./tournament-sizing";

export type TournamentResizeShape = {
  tournamentShape: string | null | undefined;
  poolCount: number | null | undefined;
  roundCount: number | null | undefined;
  qualifiersPerPool: number | null | undefined;
};

const KING_TEAM_COUNTS: readonly number[] = Array.from(
  { length: KING_COURT_MAX - KING_COURT_MIN + 1 },
  (_, index) => (KING_COURT_MIN + index) * KING_TEAMS_PER_COURT,
);

export function tournamentTeamCountFits(
  shape: TournamentResizeShape,
  teamCount: number,
): boolean {
  if (shape.tournamentShape === KING_OF_THE_COURT_SHAPE) {
    return KING_TEAM_COUNTS.includes(teamCount);
  }
  if (shape.tournamentShape === "knockout_only") {
    return tournamentTeamCountIssue(teamCount) == null;
  }
  if (shape.tournamentShape === "rounds") {
    const sized = sizeFriendlyTournament(teamCount, ROUNDS_SHAPE_POOL_COUNT);
    return (
      sized.ok &&
      validateRoundsShapeRoundCount(sized.sizing.poolSizes, shape.roundCount).ok
    );
  }
  if (shape.poolCount == null) {
    return tournamentTeamCountIssue(teamCount) == null;
  }
  const sized = sizeFriendlyTournament(teamCount, shape.poolCount);
  if (!sized.ok) {
    return false;
  }
  if (!validateRoundCount(sized.sizing.poolSizes, shape.roundCount).ok) {
    return false;
  }
  return (
    shape.tournamentShape !== "groups_then_knockout" ||
    validateQualifiersPerPool(sized.sizing.poolSizes, shape.qualifiersPerPool)
      .ok
  );
}

/** Every team count the shape takes, smallest first. */
export function tournamentTeamCountChoices(
  shape: TournamentResizeShape,
): number[] {
  const candidates =
    shape.tournamentShape === KING_OF_THE_COURT_SHAPE
      ? KING_TEAM_COUNTS
      : TOURNAMENT_TEAM_COUNTS;
  return candidates.filter((count) => tournamentTeamCountFits(shape, count));
}

/** The next count up (`1`) or down (`-1`) from `teamCount`, or `null` at the end. */
export function tournamentTeamCountStep(
  shape: TournamentResizeShape,
  teamCount: number,
  direction: 1 | -1,
): number | null {
  const choices = tournamentTeamCountChoices(shape);
  if (direction === 1) {
    return choices.find((count) => count > teamCount) ?? null;
  }
  return choices.filter((count) => count < teamCount).at(-1) ?? null;
}
