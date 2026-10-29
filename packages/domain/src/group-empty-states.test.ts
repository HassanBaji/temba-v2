import { describe, expect, it } from "vitest";

import {
  GROUP_GAMES_EMPTY_COPY,
  GROUP_STANDING_AFTER_FIRST_RESULT,
  groupGamePlayersNeeded,
  groupGamesEmptyLine,
  groupStandingEmptyFooter,
  groupStandingOpenSeats,
} from "./group-empty-states";

describe("groupGamePlayersNeeded", () => {
  it("needs a padel Match of four and a default five-a-side of ten", () => {
    expect(groupGamePlayersNeeded("padel")).toBe(4);
    expect(groupGamePlayersNeeded("football")).toBe(10);
    expect(groupGamePlayersNeeded(null)).toBe(4);
  });
});

describe("groupStandingOpenSeats", () => {
  it("pads the preview to four rows after the members", () => {
    expect(groupStandingOpenSeats(1)).toEqual([2, 3, 4]);
    expect(groupStandingOpenSeats(3)).toEqual([4]);
  });

  it("draws no open seats once the preview is full", () => {
    expect(groupStandingOpenSeats(4)).toEqual([]);
    expect(groupStandingOpenSeats(9)).toEqual([]);
  });
});

describe("groupStandingEmptyFooter", () => {
  it("counts filled seats while some are open", () => {
    expect(groupStandingEmptyFooter(1)).toBe(
      `1 of 4 seats filled. ${GROUP_STANDING_AFTER_FIRST_RESULT}`,
    );
  });

  it("drops the count once every seat is filled", () => {
    expect(groupStandingEmptyFooter(6)).toBe(GROUP_STANDING_AFTER_FIRST_RESULT);
  });
});

describe("groupGamesEmptyLine", () => {
  it("tells a member how many players the sport needs", () => {
    expect(
      groupGamesEmptyLine({
        sport: "football",
        memberCount: 1,
        isMember: true,
      }),
    ).toBe(`Football needs 10. You have 1. ${GROUP_GAMES_EMPTY_COPY}`);
    expect(
      groupGamesEmptyLine({ sport: "padel", memberCount: 2, isMember: true }),
    ).toBe(`Padel needs 4. You have 2. ${GROUP_GAMES_EMPTY_COPY}`);
  });

  it("drops the count for visitors and full Groups", () => {
    expect(
      groupGamesEmptyLine({
        sport: "football",
        memberCount: 1,
        isMember: false,
      }),
    ).toBe(GROUP_GAMES_EMPTY_COPY);
    expect(
      groupGamesEmptyLine({ sport: "padel", memberCount: 4, isMember: true }),
    ).toBe(GROUP_GAMES_EMPTY_COPY);
  });
});
