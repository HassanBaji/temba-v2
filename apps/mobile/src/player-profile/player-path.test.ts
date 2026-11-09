import { describe, expect, it } from "vitest";

import {
  playerMarkPath,
  playerMarksPath,
  playerMatchesPath,
  playerPath,
} from "./player-path";

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
    expect(playerPath(["(app)", "profile", "teams", "[id]"], USER)).toBe(
      `/profile/players/${USER}`,
    );
    expect(playerPath(["(app)", "(home)"], USER)).toBe(`/players/${USER}`);
  });

  it("stays in the Challenges tab from a Team", () => {
    expect(playerPath(["(app)", "challenges", "teams", "[id]"], USER)).toBe(
      `/challenges/players/${USER}`,
    );
  });

  it("pushes from one Player profile to another in the same tab", () => {
    expect(playerPath(["(app)", "groups", "players", "[userId]"], USER)).toBe(
      `/groups/players/${USER}`,
    );
  });

  it("opens on a sport when given", () => {
    expect(playerPath(["(app)", "games", "[id]"], USER, "football")).toBe(
      `/games/players/${USER}?sport=football`,
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

describe("playerMarksPath", () => {
  it("opens all marks in each tab's stack", () => {
    expect(
      playerMarksPath(["(app)", "groups", "players", "[userId]"], USER),
    ).toBe(`/groups/players/${USER}/marks`);
    expect(playerMarksPath(["profile"], USER, "football")).toBe(
      `/profile/players/${USER}/marks?sport=football`,
    );
    expect(playerMarksPath(["(app)", "(home)"], USER, "padel")).toBe(
      `/players/${USER}/marks?sport=padel`,
    );
  });
});

describe("playerMarkPath", () => {
  it("opens one kind on one sport's tab in the current tab", () => {
    expect(
      playerMarkPath(
        ["(app)", "games", "players", "[userId]", "marks"],
        USER,
        "clutch",
        "football",
      ),
    ).toBe(`/games/players/${USER}/marks/clutch?sport=football`);
  });
});
