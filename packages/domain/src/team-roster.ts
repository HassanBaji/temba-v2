import type { Sport } from "./sport";

export type TeamRosterRule = {
  min: number;
  max: number;
  completeAt: number;
  pairIsUnique: boolean;
};

const TEAM_ROSTER_RULES: Record<Sport, TeamRosterRule> = {
  padel: { min: 2, max: 2, completeAt: 2, pairIsUnique: true },
  football: { min: 2, max: 20, completeAt: 5, pairIsUnique: false },
};

export function teamRosterRule(sport: Sport): TeamRosterRule {
  return TEAM_ROSTER_RULES[sport];
}

export function teamIsComplete(count: number, sport: Sport) {
  return count >= teamRosterRule(sport).completeAt;
}

export function teamIsFull(count: number, sport: Sport) {
  return count >= teamRosterRule(sport).max;
}

export function teamSeatsToComplete(count: number, sport: Sport) {
  return Math.max(0, teamRosterRule(sport).completeAt - count);
}

/** A Team that can hold more members than it needs to be complete. */
export function teamIsSquad(sport: Sport) {
  const { min, max } = teamRosterRule(sport);
  return max > min;
}

export function openInviteBudget(
  count: number,
  unusedInvites: number,
  sport: Sport,
) {
  return Math.max(0, teamRosterRule(sport).max - count - unusedInvites);
}

/** The football Side sizes a Challenge may ask for: 5, 6 or 7-a-side. */
export const FOOTBALL_CHALLENGE_SIDE_SIZES = [5, 6, 7] as const;

export type FootballChallengeSideSize =
  (typeof FOOTBALL_CHALLENGE_SIDE_SIZES)[number];

/** A football Roster may post a Format once it holds that Format's side. */
export function teamCanPostFormat(count: number, sideSize: number) {
  return count >= sideSize;
}

export function formatsPlayable(count: number): FootballChallengeSideSize[] {
  return FOOTBALL_CHALLENGE_SIDE_SIZES.filter((sideSize) =>
    teamCanPostFormat(count, sideSize),
  );
}
