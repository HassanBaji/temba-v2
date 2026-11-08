import type { DbClient, DbTx } from "@repo/db";
import { inArray } from "drizzle-orm";

import { teamMembers } from "@repo/db";
import type { ChallengeIneligibleReason } from "@repo/domain/challenge-card";
import type { TeamLevel } from "@repo/domain/team-level";
import { teamRosterRule } from "@repo/domain/team-roster";

import { teamsUserActsFor } from "#src/teams/acts-for-team";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamLevels, teamLevelInRange } from "#src/teams/team-level";

type DbOrTx = DbClient | DbTx;

/** A Team the viewer acts for, with what proposing asks of it. */
export type ViewerTeam = {
  id: string;
  displayName: string;
  sport: "padel" | "football";
  rosterCount: number;
  memberUserIds: string[];
  teamLevel: TeamLevel | null;
};

export type ChallengeForEligibility = {
  teamId: string;
  sport: "padel" | "football";
  sideSize: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
};

/** Most specific first, so the card says the reason a Team is closest to fixing. */
const REASON_ORDER: readonly ChallengeIneligibleReason[] = [
  "own",
  "roster_short",
  "padel_incomplete",
  "level_outside",
  "no_level",
  "shares_member",
];

export async function loadViewerTeams(
  database: DbOrTx,
  userId: string,
  now: Date = new Date(),
): Promise<ViewerTeam[]> {
  const teams = await teamsUserActsFor(database, userId);
  if (teams.length === 0) {
    return [];
  }
  const members = await database.query.teamMembers.findMany({
    where: inArray(
      teamMembers.teamId,
      teams.map((team) => team.id),
    ),
    columns: { teamId: true, userId: true },
    with: { user: { columns: { name: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  const levels = await loadTeamLevels(database, teams, now);
  return teams.map((team) => {
    const roster = members.filter((member) => member.teamId === team.id);
    return {
      id: team.id,
      displayName: teamDisplayName(
        team.name,
        roster.map((member) => member.user.name),
      ),
      sport: team.sport,
      rosterCount: roster.length,
      memberUserIds: roster.map((member) => member.userId),
      teamLevel: levels.get(team.id) ?? null,
    };
  });
}

function ineligibleReason(
  challenge: ChallengeForEligibility,
  posterMemberUserIds: ReadonlySet<string>,
  team: ViewerTeam,
): ChallengeIneligibleReason | null {
  if (team.id === challenge.teamId) {
    return "own";
  }
  if (team.memberUserIds.some((userId) => posterMemberUserIds.has(userId))) {
    return "shares_member";
  }
  if (challenge.sport === "padel") {
    if (team.rosterCount < teamRosterRule("padel").max) {
      return "padel_incomplete";
    }
  } else if (
    team.rosterCount <
    (challenge.sideSize ?? teamRosterRule("football").completeAt)
  ) {
    return "roster_short";
  }
  if (!teamLevelInRange(team.teamLevel, challenge)) {
    return team.teamLevel ? "level_outside" : "no_level";
  }
  return null;
}

/**
 * Which of the viewer's Teams may propose on a Challenge: same sport, not the
 * poster and sharing no member with it, Roster at least the Format's side
 * (padel: both players), Team Level inside the Level wanted. With none, the
 * reason the card greys.
 */
export function viewerEligibility(
  challenge: ChallengeForEligibility,
  posterMemberUserIds: readonly string[],
  viewerTeams: readonly ViewerTeam[],
) {
  const posterMembers = new Set(posterMemberUserIds);
  const ofSport = viewerTeams.filter((team) => team.sport === challenge.sport);
  const eligibleTeams: { id: string; displayName: string }[] = [];
  const reasons = new Set<ChallengeIneligibleReason>();
  for (const team of ofSport) {
    const reason = ineligibleReason(challenge, posterMembers, team);
    if (reason) {
      reasons.add(reason);
    } else {
      eligibleTeams.push({ id: team.id, displayName: team.displayName });
    }
  }
  const reason: ChallengeIneligibleReason | null =
    eligibleTeams.length > 0
      ? null
      : (REASON_ORDER.find((candidate) => reasons.has(candidate)) ?? "no_team");
  return {
    eligibleTeams,
    ineligibleReason: reason,
    actsForPoster: viewerTeams.some((team) => team.id === challenge.teamId),
  };
}
