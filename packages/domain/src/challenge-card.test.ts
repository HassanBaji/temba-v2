import { describe, expect, it } from "vitest";

import {
  challengeBoardFilterGroups,
  challengeBoardQuery,
  challengeCardView,
  challengeLevelWanted,
  challengeWhenLine,
  NO_CHALLENGE_BOARD_FILTERS,
  type ChallengeCardInput,
} from "./challenge-card";

const now = new Date("2026-11-08T10:00:00Z");

function card(overrides: Partial<ChallengeCardInput> = {}): ChallengeCardInput {
  return {
    id: "c1",
    sport: "football",
    sideSize: 6,
    levelMinTenths: 28,
    levelMaxTenths: 48,
    days: ["sat", "sun"],
    timings: ["evening"],
    exactSlots: [],
    venues: [{ name: "Matchday Pitches" }],
    note: null,
    proposalCount: 2,
    expiresAt: new Date("2026-11-13T10:00:00Z"),
    team: {
      displayName: "Gooz FC",
      rosterCount: 12,
      teamLevel: { level: "2.8" },
      members: Array.from({ length: 12 }, (_, index) => ({
        name: `Player ${index}`,
      })),
    },
    viewer: { ineligibleReason: null },
    ...overrides,
  };
}

describe("challengeCardView", () => {
  it("reads the football card lines", () => {
    const view = challengeCardView(card(), "en", now);
    expect(view.title).toBe("Gooz FC");
    expect(view.sportLine).toBe(
      "Football, 6-a-side, avg 2.8, 12 on the roster. Wants C to B-",
    );
    expect(view.whenLine).toBe("Weekends · Evenings");
    expect(view.venuesLine).toBe("Matchday Pitches");
    expect(view.proposalsLine).toBe("2 proposals, 5 days left");
    expect(view.tiles).toHaveLength(6);
    expect(view.opponentSeats).toBe(6);
    expect(view.greyed).toBe(false);
  });

  it("reads a padel card without a Team Level or Level wanted", () => {
    const view = challengeCardView(
      card({
        sport: "padel",
        sideSize: null,
        levelMinTenths: null,
        levelMaxTenths: null,
        days: [],
        timings: [],
        venues: [],
        proposalCount: 0,
        team: {
          displayName: "Seef Smashers",
          rosterCount: 2,
          teamLevel: null,
          members: [{ name: "Ali" }, { name: "Omar" }],
        },
      }),
      "en",
      now,
    );
    expect(view.sportLine).toBe("Padel. Open to any level");
    expect(view.whenLine).toBe("Any day · Any time");
    expect(view.venuesLine).toBe("Any venue");
    expect(view.proposalsLine).toBe("No proposals yet, 5 days left");
    expect(view.opponentSeats).toBe(2);
  });

  it("greys the card and says why, except on the viewer's own Challenge", () => {
    const short = challengeCardView(
      card({ viewer: { ineligibleReason: "roster_short" } }),
      "en",
      now,
    );
    expect(short.greyed).toBe(true);
    expect(short.greyedLine).toBe("Your Roster is short for 6-a-side");
    const own = challengeCardView(
      card({ viewer: { ineligibleReason: "own" } }),
      "en",
      now,
    );
    expect(own.greyed).toBe(false);
    expect(own.greyedLine).toBe("Your Team's challenge");
  });

  it("lists exact slots after the days and timings", () => {
    const view = challengeCardView(
      card({ exactSlots: [new Date("2026-11-13T16:00:00Z")] }),
      "en",
      now,
    );
    expect(view.slotsLine).toBe("Or Fri 13 Nov, 7:00 PM");
  });
});

describe("challengeLevelWanted and challengeWhenLine", () => {
  it("reads one-sided and single-band ranges", () => {
    expect(challengeLevelWanted(42, null, "en")).toBe("Wants B- and up");
    expect(challengeLevelWanted(null, 34, "en")).toBe("Wants C and under");
    expect(challengeLevelWanted(28, 34, "en")).toBe("Wants C");
  });

  it("names weekdays and picked days in week order", () => {
    expect(
      challengeWhenLine(["mon", "tue", "wed", "thu", "fri"], [], "en"),
    ).toBe("Weekdays · Any time");
    expect(
      challengeWhenLine(["sat", "tue"], ["evening", "morning"], "en"),
    ).toBe("Tue, Sat · Mornings, Evenings");
  });
});

describe("board filters", () => {
  it("asks for nothing without filters", () => {
    expect(challengeBoardQuery(NO_CHALLENGE_BOARD_FILTERS)).toEqual({});
  });

  it("turns a Level band into its tenths and passes the rest", () => {
    expect(
      challengeBoardQuery({
        sport: "padel",
        level: "C",
        area: "Lisbon",
        day: "fri",
      }),
    ).toEqual({
      sport: "padel",
      levelMinTenths: 28,
      levelMaxTenths: 34,
      area: "Lisbon",
      weekday: "fri",
    });
  });

  it("puts Any first in each group and marks the pick", () => {
    const groups = challengeBoardFilterGroups(
      { ...NO_CHALLENGE_BOARD_FILTERS, area: "Porto" },
      ["Lisbon", "Porto"],
      "en",
    );
    expect(groups.map((group) => group.label)).toEqual([
      "Sport",
      "Level",
      "Area",
      "Day",
    ]);
    const area = groups[2]!;
    expect(area.summary).toBe("Porto");
    expect(
      area.options.map((option) => [option.label, option.selected]),
    ).toEqual([
      ["Any", false],
      ["Lisbon", false],
      ["Porto", true],
    ]);
  });
});
