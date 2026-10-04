export const TEAMS_PATH = "/profile/teams";
export const NEW_TEAM_PATH = "/profile/teams/new";

export function teamPath(teamId: string) {
  return `${TEAMS_PATH}/${teamId}`;
}
