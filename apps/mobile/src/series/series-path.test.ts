import { describe, expect, it } from "vitest";

import { seriesPath } from "./series-path";

const SERIES = "5b1f0a3e-8c2d-4f49-9a55-6a1f3b1f0a02";

describe("seriesPath", () => {
  it("stays in the Groups tab from a Group home", () => {
    expect(seriesPath(["(app)", "groups", "[id]"], SERIES)).toBe(
      `/groups/series/${SERIES}`,
    );
  });

  it("stays in the Games tab from a Game", () => {
    expect(seriesPath(["(app)", "games", "[id]"], SERIES)).toBe(
      `/games/series/${SERIES}`,
    );
  });

  it("stays in the Challenges tab from a Player profile", () => {
    expect(
      seriesPath(["(app)", "challenges", "players", "[userId]"], SERIES),
    ).toBe(`/challenges/series/${SERIES}`);
  });

  it("stays in the Profile tab from the player's own profile", () => {
    expect(seriesPath(["(app)", "profile"], SERIES)).toBe(
      `/profile/series/${SERIES}`,
    );
  });

  it("stays in the Home stack from Home", () => {
    expect(seriesPath(["(app)", "(home)"], SERIES)).toBe(`/series/${SERIES}`);
  });

  it("pushes from one Series page to another in the same tab", () => {
    expect(seriesPath(["(app)", "groups", "series", "[id]"], SERIES)).toBe(
      `/groups/series/${SERIES}`,
    );
  });

  it("falls back to the Home stack outside a tab", () => {
    expect(seriesPath([], SERIES)).toBe(`/series/${SERIES}`);
  });
});
