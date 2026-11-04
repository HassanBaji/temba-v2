import { describe, expect, it } from "vitest";

import {
  gameRatingScope,
  gameRatingScopeLabel,
  ratedScopeForGroup,
  ratingFlagsAtCreate,
} from "./game-rating-scope";

describe("gameRatingScope", () => {
  it("reads a Temba rated Game as temba", () => {
    expect(gameRatingScope({ rated: true, groupRated: true })).toBe("temba");
  });

  it("reads a legacy groupless rated Game as temba", () => {
    expect(gameRatingScope({ rated: true, groupRated: false })).toBe("temba");
  });

  it("reads a group rated Game as group", () => {
    expect(gameRatingScope({ rated: false, groupRated: true })).toBe("group");
  });

  it("reads a Game with neither flag as unrated", () => {
    expect(gameRatingScope({ rated: false, groupRated: false })).toBe(
      "unrated",
    );
  });
});

describe("ratingFlagsAtCreate", () => {
  const padelOnGroup = {
    hasGroup: true,
    sport: "padel" as const,
    rated: true,
  };

  it("rates Temba and Group on a Verified Group", () => {
    expect(
      ratingFlagsAtCreate({ ...padelOnGroup, groupVerified: true }),
    ).toEqual({ rated: true, groupRated: true });
  });

  it("rates the Group only on a Group that is not Verified", () => {
    expect(
      ratingFlagsAtCreate({ ...padelOnGroup, groupVerified: false }),
    ).toEqual({ rated: false, groupRated: true });
  });

  it("rates nothing when the creator chose Unrated", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        groupVerified: true,
        rated: false,
      }),
    ).toEqual({ rated: false, groupRated: false });
  });

  it("rates nothing without a Group", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        hasGroup: false,
        groupVerified: false,
      }),
    ).toEqual({ rated: false, groupRated: false });
  });

  it("rates nothing for football", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        sport: "football",
        groupVerified: true,
      }),
    ).toEqual({ rated: false, groupRated: false });
  });
});

describe("ratedScopeForGroup", () => {
  it("is temba on a Verified Group and group otherwise", () => {
    expect(ratedScopeForGroup(true)).toBe("temba");
    expect(ratedScopeForGroup(false)).toBe("group");
  });
});

describe("gameRatingScopeLabel", () => {
  it("names each scope", () => {
    expect(gameRatingScopeLabel("temba", "en")).toBe("Counts for Temba rating");
    expect(gameRatingScopeLabel("group", "en")).toBe("Counts for group rating");
    expect(gameRatingScopeLabel("unrated", "en")).toBe("Unrated");
  });
});
