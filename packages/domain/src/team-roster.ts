import type { Sport } from "./sport";

export type TeamRosterRule = {
  min: number;
  max: number;
  completeAt: number;
  pairIsUnique: boolean;
};

const TEAM_ROSTER_RULES: Record<Sport, TeamRosterRule> = {
  padel: { min: 2, max: 2, completeAt: 2, pairIsUnique: true },
  football: { min: 2, max: 25, completeAt: 5, pairIsUnique: false },
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
