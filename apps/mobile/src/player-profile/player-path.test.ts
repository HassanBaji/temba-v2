import { describe, expect, it } from "vitest";

import { playerMatchesPath, playerPath } from "./player-path";

const USER = "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01";

describe("playerPath", () => {
  it("stays in the Groups tab from a Group's Members tab", () => {
    expect(playerPath(["(app)", "groups", "[id]"], USER)).toBe(
      `/groups/players/${USER}`,
    );
  });

  it("stays in each tab's stack", () => {
    expect(playerPath(["(app)", "games", "[id]"], USER)).toBe(
      `/games/players/${USER}`,
    );
    expect(playerPath(["(app)", "communities", "[id]"], USER)).toBe(
      `/communities/players/${USER}`,
    );
    expect(playerPath(["(app)", "profile", "teams", "[id]"], USER)).toBe(
      `/profile/players/${USER}`,
    );
    expect(playerPath(["(app)", "(home)"], USER)).toBe(`/players/${USER}`);
  });

  it("pushes from one Player profile to another in the same tab", () => {
    expect(playerPath(["(app)", "groups", "players", "[userId]"], USER)).toBe(
      `/groups/players/${USER}`,
    );
  });

  it("falls back to the Home stack outside a tab", () => {
    expect(playerPath([], USER)).toBe(`/players/${USER}`);
  });
});

describe("playerMatchesPath", () => {
  it("opens the Last 10 screen in the current tab", () => {
    expect(
      playerMatchesPath(["(app)", "groups", "players", "[userId]"], USER),
    ).toBe(`/groups/players/${USER}/matches`);
  });

  it("carries the Match to open", () => {
    expect(playerMatchesPath(["(app)", "(home)"], USER, "match-1")).toBe(
      `/players/${USER}/matches?match=match-1`,
    );
  });
});
