import { describe, expect, it } from "vitest";

import {
  groupGamePlayersNeeded,
  groupGamesEmptyCopy,
  groupGamesEmptyLine,
  groupStandingAfterFirstResult,
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
    expect(groupStandingEmptyFooter(1, "en")).toBe(
      "1 of 4 seats filled. Standings appear after the first result.",
    );
  });

  it("drops the count once every seat is filled", () => {
    expect(groupStandingEmptyFooter(6, "en")).toBe(
      groupStandingAfterFirstResult("en"),
    );
    expect(groupStandingAfterFirstResult("en")).toBe(
      "Standings appear after the first result.",
    );
  });

  it("reads in Arabic", () => {
    expect(groupStandingEmptyFooter(6, "ar")).toBe(
      "يظهر الترتيب بعد أول نتيجة.",
    );
  });
});

describe("groupGamesEmptyLine", () => {
  it("tells a member how many players the sport needs", () => {
    expect(
      groupGamesEmptyLine({
        sport: "football",
        memberCount: 1,
        isMember: true,
        locale: "en",
      }),
    ).toBe(`Football needs 10. You have 1. ${groupGamesEmptyCopy("en")}`);
    expect(
      groupGamesEmptyLine({
        sport: "padel",
        memberCount: 2,
        isMember: true,
        locale: "en",
      }),
    ).toBe(`Padel needs 4. You have 2. ${groupGamesEmptyCopy("en")}`);
  });

  it("drops the count for visitors and full Groups", () => {
    expect(
      groupGamesEmptyLine({
        sport: "football",
        memberCount: 1,
        isMember: false,
        locale: "en",
      }),
    ).toBe(groupGamesEmptyCopy("en"));
    expect(
      groupGamesEmptyLine({
        sport: "padel",
        memberCount: 4,
        isMember: true,
        locale: "en",
      }),
    ).toBe(groupGamesEmptyCopy("en"));
  });
});
