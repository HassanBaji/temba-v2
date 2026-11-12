import { describe, expect, it } from "vitest";

import {
  gameRatingScope,
  gameRatingScopeLabel,
  groupHasTier,
  isPublicGame,
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

  it("moves the Temba Level only for padel on a Verified Group", () => {
    expect(
      ratingFlagsAtCreate({ ...padelOnGroup, groupVerified: true }),
    ).toEqual({ rated: true, groupRated: false });
  });

  it("is Unrated for padel on a Group that is not Verified", () => {
    expect(
      ratingFlagsAtCreate({ ...padelOnGroup, groupVerified: false }),
    ).toEqual({ rated: false, groupRated: false });
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

describe("ratingFlagsAtCreate for a Public Game", () => {
  it("moves the Temba Level, with no Group", () => {
    expect(
      ratingFlagsAtCreate({
        hasGroup: false,
        groupVerified: false,
        sport: "padel",
        rated: false,
        isPublic: true,
      }),
    ).toEqual({ rated: true, groupRated: false });
  });
});

describe("isPublicGame", () => {
  it("is a public Game with no Group", () => {
    expect(isPublicGame({ isPublic: true, groupId: null })).toBe(true);
    expect(isPublicGame({ isPublic: true, groupId: "group-1" })).toBe(false);
    expect(isPublicGame({ isPublic: false, groupId: null })).toBe(false);
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
  it("is temba on a Verified Group", () => {
    expect(ratedScopeForGroup(true)).toBe("temba");
    expect(ratedScopeForGroup(true, "football")).toBe("temba");
  });

  it("is group on a tier Group and unrated on a padel Group that is not Verified", () => {
    expect(ratedScopeForGroup(false, "football")).toBe("group");
    expect(ratedScopeForGroup(false, "padel")).toBe("unrated");
    expect(ratedScopeForGroup(false)).toBe("unrated");
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
