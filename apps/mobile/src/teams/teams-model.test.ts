import { describe, expect, it } from "vitest";

import { NEW_TEAM_PATH, TEAMS_PATH, teamPath } from "./teams-model";

describe("team paths", () => {
  it("nests every Team route under the Profile tab", () => {
    expect(TEAMS_PATH).toBe("/profile/teams");
    expect(NEW_TEAM_PATH).toBe("/profile/teams/new");
    expect(teamPath("t1")).toBe("/profile/teams/t1");
  });
});
