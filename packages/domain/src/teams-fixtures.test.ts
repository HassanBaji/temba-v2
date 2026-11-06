import { describe, expect, it } from "vitest";

import { teamHomeView } from "./teams";
import { createTeamsFixtures } from "./teams-fixtures";

describe("createTeamsFixtures", () => {
  const fixtures = createTeamsFixtures();

  it("reaches every Team home state", () => {
    const view = (key: keyof typeof fixtures.home) =>
      teamHomeView(fixtures.home[key], "en");
    expect(view("incomplete").primaryInvite).toBe(true);
    expect(view("waiting").waitingNote).toBe(true);
    expect(view("record").stats[3]?.value).toBe("67%");
  });

  it("lists a full and an incomplete Team", () => {
    expect(fixtures.list.mixed.map((team) => team.incomplete)).toEqual([
      false,
      true,
    ]);
    expect(fixtures.list.empty).toEqual([]);
  });
});
