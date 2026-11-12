import { describe, expect, it } from "vitest";

import {
  gameRatingScope,
  gameRatingScopeLabel,
  groupHasTier,
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

  it("moves Tier points for football on a Group that is not Verified", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        sport: "football",
        groupVerified: false,
      }),
    ).toEqual({ rated: false, groupRated: true });
  });

  it("moves the Temba Level only for football on a Verified Group", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        sport: "football",
        groupVerified: true,
      }),
    ).toEqual({ rated: true, groupRated: false });
  });

  it("moves nothing for football on a Verified Group its creator chose Unrated", () => {
    expect(
      ratingFlagsAtCreate({
        ...padelOnGroup,
        sport: "football",
        groupVerified: true,
        rated: false,
      }),
    ).toEqual({ rated: false, groupRated: false });
  });

  it("moves nothing for an Unrated or groupless football Game", () => {
    const football = {
      ...padelOnGroup,
      sport: "football" as const,
      groupVerified: false,
    };
    expect(ratingFlagsAtCreate({ ...football, rated: false })).toEqual({
      rated: false,
      groupRated: false,
    });
    expect(ratingFlagsAtCreate({ ...football, hasGroup: false })).toEqual({
      rated: false,
      groupRated: false,
    });
  });
});

describe("groupHasTier", () => {
  it("is a football Group that is not Verified", () => {
    expect(groupHasTier({ sport: "football", verified: false })).toBe(true);
    expect(groupHasTier({ sport: "football", verified: true })).toBe(false);
    expect(groupHasTier({ sport: "padel", verified: false })).toBe(false);
    expect(groupHasTier({ sport: null, verified: false })).toBe(false);
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

  it("names the group scope a group tier on football", () => {
    expect(gameRatingScopeLabel("group", "en", "football")).toBe(
      "Counts for group tier",
    );
    expect(gameRatingScopeLabel("group", "en", "padel")).toBe(
      "Counts for group rating",
    );
  });

  it("names the temba scope the Temba Level on football", () => {
    expect(gameRatingScopeLabel("temba", "en", "football")).toBe(
      "Counts for Temba Level",
    );
    expect(gameRatingScopeLabel("unrated", "en", "football")).toBe("Unrated");
  });
});
