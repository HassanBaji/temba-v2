import { describe, expect, it } from "vitest";

import {
  PUBLIC_GROUP_SPORT_FILTERS,
  publicGroupSportFilterInput,
  publicGroupSportFilterLabel,
  sportGlyph,
  sportLabel,
  sportsPlayed,
} from "./sport";

describe("sport", () => {
  it("labels known sports and passes unknown values through", () => {
    expect(sportLabel("padel")).toBe("Padel");
    expect(sportLabel("football")).toBe("Football");
    expect(sportLabel("squash")).toBe("squash");
  });

  it("returns null for an absent or blank sport", () => {
    expect(sportLabel(null)).toBeNull();
    expect(sportLabel(undefined)).toBeNull();
    expect(sportLabel("  ")).toBeNull();
  });

  it("gives each sport a glyph name and none for unknown values", () => {
    expect(sportGlyph("padel")).toBe("circle-dot");
    expect(sportGlyph("football")).toBe("goal");
    expect(sportGlyph("squash")).toBeNull();
    expect(sportGlyph(null)).toBeNull();
  });

  it("models the Public Groups filter as All, Padel, Football", () => {
    expect(PUBLIC_GROUP_SPORT_FILTERS.map(publicGroupSportFilterLabel)).toEqual(
      ["All", "Padel", "Football"],
    );
    expect(publicGroupSportFilterInput("all")).toBeUndefined();
    expect(publicGroupSportFilterInput("football")).toEqual({
      sport: "football",
    });
  });

  it("reads Sports played in a fixed order, and none recorded as padel only", () => {
    expect(sportsPlayed(["football", "padel"])).toEqual(["padel", "football"]);
    expect(sportsPlayed(["football"])).toEqual(["football"]);
    expect(sportsPlayed(null)).toEqual(["padel"]);
    expect(sportsPlayed([])).toEqual(["padel"]);
  });
});
