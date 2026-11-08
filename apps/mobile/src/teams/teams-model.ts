import { challengesTabQuery } from "@repo/domain/challenges-tab";

/** Teams live in Challenges › Teams; a Team's own screens nest under the Challenges tab. */
export const TEAMS_PATH = `/challenges${challengesTabQuery("teams")}`;
export const NEW_TEAM_PATH = "/challenges/teams/new";

export function teamPath(teamId: string) {
  return `/challenges/teams/${teamId}`;
}

/** Create team, tagged to `groupId` when given. */
export function newTeamPath(groupId?: string | null) {
  return groupId
    ? `${NEW_TEAM_PATH}?groupId=${encodeURIComponent(groupId)}`
    : NEW_TEAM_PATH;
}
