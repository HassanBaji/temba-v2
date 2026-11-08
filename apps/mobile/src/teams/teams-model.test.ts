import { describe, expect, it } from "vitest";

import {
  NEW_TEAM_PATH,
  TEAMS_PATH,
  newTeamPath,
  teamPath,
} from "./teams-model";

describe("team paths", () => {
  it("nests every Team route under the Challenges tab", () => {
    expect(TEAMS_PATH).toBe("/challenges?tab=teams");
    expect(NEW_TEAM_PATH).toBe("/challenges/teams/new");
    expect(teamPath("t1")).toBe("/challenges/teams/t1");
  });

  it("tags a new Team to a Group when one is given", () => {
    expect(newTeamPath()).toBe("/challenges/teams/new");
    expect(newTeamPath("g 1")).toBe("/challenges/teams/new?groupId=g%201");
  });
});
